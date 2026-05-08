import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, retry, timer } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { PrismaService } from '../prisma/prisma.service';

/**
 * YouTrack API Base Client
 *
 * Предоставляет низкоуровневый HTTP-клиент для работы с YouTrack REST API.
 * Настройки (baseUrl, token) загружаются из БД (таблица IntegrationSettings),
 * а не из переменных окружения. Это позволяет менять их через веб-интерфейс.
 *
 * Поддержка: пагинация, retry, timeout, rate limiting.
 */
@Injectable()
export class YouTrackApiClient {
  private readonly logger = new Logger(YouTrackApiClient.name);
  private baseUrl = '';
  private token = '';
  private defaultTimeout = 30000;
  private maxRetries = 3;
  private pageSize = 50;

  /** Rate limiting: timestamp последнего запроса */
  private lastRequestTime = 0;
  /** Минимальный интервал между запросами (мс) — 1 запрос в 200 мс (5 RPS) */
  private readonly minRequestInterval = 200;
  /** Флаг: были ли загружены настройки из БД */
  private configLoaded = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Загрузить настройки из БД (таблица IntegrationSettings)
   */
  async loadConfig(): Promise<void> {
    try {
      const settings = await this.prisma.integrationSettings.findFirst();
      if (settings) {
        if (settings.baseUrl) this.baseUrl = settings.baseUrl;
        if (settings.apiTokenEncrypted) this.token = settings.apiTokenEncrypted;
        if (settings.requestTimeout) {
          this.defaultTimeout = Number(settings.requestTimeout) || 30000;
        }
        if (settings.retryCount !== null && settings.retryCount !== undefined) {
          this.maxRetries = Number(settings.retryCount) || 3;
        }
        this.configLoaded = true;
        this.logger.log(`YouTrack API client configured: ${settings.baseUrl}`);
      } else {
        this.logger.warn('No IntegrationSettings found in database. YouTrack sync unavailable.');
      }
    } catch (error) {
      this.logger.error(`Failed to load YouTrack config from DB: ${(error as Error).message}`);
    }
  }

  /**
   * Проверка, настроен ли клиент
   */
  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  /**
   * Получить базовый URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * GET-запрос с поддержкой пагинации
   */
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    paginated = false,
  ): Promise<T> {
    await this.ensureConfig();
    if (paginated) {
      return this.getPaginated<T>(path, params);
    }
    return this.request<T>('GET', path, { params });
  }

  /**
   * POST-запрос
   */
  async post<T>(path: string, data?: unknown): Promise<T> {
    await this.ensureConfig();
    return this.request<T>('POST', path, { data });
  }

  /**
   * PUT-запрос
   */
  async put<T>(path: string, data?: unknown): Promise<T> {
    await this.ensureConfig();
    return this.request<T>('PUT', path, { data });
  }

  private async ensureConfig(): Promise<void> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
  }

  private async request<T>(
    method: string,
    path: string,
    config?: Partial<AxiosRequestConfig> & { paginated?: boolean },
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error(
        'YouTrack API client is not configured. Set YouTrack URL and token in Settings → Integrations.',
      );
    }

    await this.enforceRateLimit();

    const url = `${this.baseUrl}/api${path}`;

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      timeout: this.defaultTimeout,
      ...config,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.request<T>(requestConfig).pipe(
          retry({
            count: this.maxRetries,
            delay: (error, retryCount) => {
              if (this.isRetryable(error)) {
                const delayMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
                this.logger.warn(
                  `Retry ${retryCount}/${this.maxRetries} for ${url}: ${error.message}. Waiting ${delayMs}ms`,
                );
                return timer(delayMs);
              }
              throw error;
            },
          }),
          catchError((error: AxiosError) => {
            throw this.normalizeError(error, url);
          }),
        ),
      );

      return data;
    } catch (error) {
      this.configLoaded = false;
      throw error;
    }
  }

  /**
   * Принудительно обновить конфигурацию из БД.
   * Вызывается после сохранения настроек интеграции через API.
   */
  async reloadConfig(): Promise<void> {
    this.configLoaded = false;
    await this.loadConfig();
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  private isRetryable(error: AxiosError): boolean {
    if (!error.response) return true;
    const status = error.response.status;
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }

  private normalizeError(error: AxiosError, url: string): Error {
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data as Record<string, unknown> | undefined;
      const errorMessage =
        (responseData?.error_description as string) ||
        (responseData?.error as string) ||
        error.message;
      switch (status) {
        case 401:
          return new Error(`YouTrack authentication failed (401). Check token. URL: ${url}`);
        case 403:
          return new Error(`YouTrack access denied (403). Token permissions. URL: ${url}`);
        case 404:
          return new Error(`YouTrack resource not found (404). URL: ${url}`);
        case 429:
          return new Error(`YouTrack rate limit exceeded (429). URL: ${url}`);
        default:
          return new Error(`YouTrack API error (${status}): ${errorMessage}. URL: ${url}`);
      }
    }
    if (error.code === 'ECONNABORTED') {
      return new Error(`YouTrack request timeout. URL: ${url}`);
    }
    if (error.code === 'ECONNREFUSED') {
      return new Error(`YouTrack connection refused. Check URL. URL: ${url}`);
    }
    return new Error(`YouTrack request failed: ${error.message}. URL: ${url}`);
  }

  private async getPaginated<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const allItems: unknown[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const paginatedParams = { ...params, $skip: skip, $top: this.pageSize };
      const result = await this.request<T[]>('GET', path, { params: paginatedParams });
      if (Array.isArray(result)) {
        allItems.push(...result);
        if (result.length < this.pageSize) hasMore = false;
        else skip += this.pageSize;
      } else {
        hasMore = false;
      }
    }
    return allItems as unknown as T;
  }
