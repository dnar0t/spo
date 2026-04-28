import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, retry, timer } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * YouTrack API Base Client
 *
 * Предоставляет низкоуровневый HTTP-клиент для работы с YouTrack REST API.
 * Поддержка: пагинация, retry, timeout, rate limiting.
 *
 * @see https://www.jetbrains.com/help/youtrack/devportal/api.html
 */
@Injectable()
export class YouTrackApiClient {
  private readonly logger = new Logger(YouTrackApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;
  private readonly pageSize: number;

  /** Rate limiting: timestamp последнего запроса */
  private lastRequestTime = 0;
  /** Минимальный интервал между запросами (мс) — 1 запрос в 200 мс (5 RPS) */
  private readonly minRequestInterval = 200;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('YOUTRACK_BASE_URL', '');
    this.token = this.configService.get<string>('YOUTRACK_TOKEN', '');
    this.defaultTimeout = this.configService.get<number>('YOUTRACK_TIMEOUT', 30000);
    this.maxRetries = this.configService.get<number>('YOUTRACK_RETRY_COUNT', 3);
    this.pageSize = this.configService.get<number>('YOUTRACK_PAGE_SIZE', 50);
  }

  /**
   * Проверка, настроен ли клиент
   */
  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  /**
   * GET-запрос с поддержкой пагинации
   *
   * @param path - путь относительно baseUrl (например, /api/issues)
   * @param params - query-параметры
   * @param paginated -是否需要 пагинацию (если true, автоматически загружает все страницы)
   */
  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    paginated = false,
  ): Promise<T> {
    if (paginated) {
      return this.getPaginated<T>(path, params);
    }
    return this.request<T>('GET', path, { params });
  }

  /**
   * GET-запрос с автоматической пагинацией (загружает все страницы)
   */
  private async getPaginated<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const allItems: unknown[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedParams = {
        ...params,
        $skip: skip,
        $top: this.pageSize,
      };

      const result = await this.request<T[]>('GET', path, {
        params: paginatedParams,
      });

      if (Array.isArray(result)) {
        allItems.push(...result);
        if (result.length < this.pageSize) {
          hasMore = false;
        } else {
          skip += this.pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allItems as unknown as T;
  }

  /**
   * POST-запрос
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { data: body });
  }

  /**
   * PUT-запрос
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { data: body });
  }

  /**
   * DELETE-запрос
   */
  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Базовый метод выполнения HTTP-запроса с retry и rate limiting
   */
  private async request<T>(
    method: string,
    path: string,
    config?: Partial<AxiosRequestConfig>,
  ): Promise<T> {
    if (!this.isConfigured) {
      throw new Error(
        'YouTrack API client is not configured. Set YOUTRACK_BASE_URL and YOUTRACK_TOKEN.',
      );
    }

    // Rate limiting: ждём, если не прошло minRequestInterval с последнего запроса
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

    this.logger.debug(`→ ${method} ${url}`);

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

      this.lastRequestTime = Date.now();
      return data;
    } catch (error) {
      this.lastRequestTime = Date.now();
      throw error;
    }
  }

  /**
   * Принудительное соблюдение rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Проверка, можно ли повторить запрос при ошибке
   */
  private isRetryable(error: AxiosError): boolean {
    if (!error.response) {
      // Сетевая ошибка (таймаут, DNS и т.п.) — retry
      return true;
    }

    const status = error.response.status;

    // 429 Too Many Requests — retry
    if (status === 429) return true;

    // 5xx — retry
    if (status >= 500 && status < 600) return true;

    return false;
  }

  /**
   * Нормализация ошибок YouTrack API в читаемый формат
   */
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
          return new Error(
            `YouTrack authentication failed (401). Check YOUTRACK_TOKEN. URL: ${url}`,
          );
        case 403:
          return new Error(
            `YouTrack access denied (403). Token might not have sufficient permissions. URL: ${url}`,
          );
        case 404:
          return new Error(`YouTrack resource not found (404). URL: ${url}`);
        case 429:
          return new Error(`YouTrack rate limit exceeded (429). URL: ${url}`);
        default:
          return new Error(
            `YouTrack API error (${status}): ${errorMessage}. URL: ${url}`,
          );
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error(`YouTrack request timeout. URL: ${url}`);
    }

    if (error.code === 'ECONNREFUSED') {
      return new Error(
        `YouTrack connection refused. Check YOUTRACK_BASE_URL. URL: ${url}`,
      );
    }

    return new Error(`YouTrack request failed: ${error.message}. URL: ${url}`);
  }

  /**
   * Получить базовый URL (для логирования)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
