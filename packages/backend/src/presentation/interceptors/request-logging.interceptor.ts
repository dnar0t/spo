/**
 * RequestLoggingInterceptor
 *
 * Глобальный interceptor для логирования входящих HTTP запросов и ответов.
 *
 * Логирует:
 * - Входящий запрос: метод, URL, query параметры (маскированные), ID пользователя (если аутентифицирован)
 * - Исходящий ответ: статус код, длительность, размер ответа
 *
 * Маскирует чувствительные данные: пароли, токены, секреты.
 * Уровень логирования: INFO для 2xx/3xx, WARN для 4xx, ERROR для 5xx.
 * В development режиме включает тело запроса (маскированное).
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'session',
]);

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const startTime = Date.now();

    const method = request.method;
    const url = request.originalUrl || request.url;
    const maskedQuery = this.maskSensitiveData(request.query as Record<string, unknown>);
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';
    const ip = request.ip || request.socket?.remoteAddress || 'unknown';

    // Log incoming request
    const logContext: Record<string, unknown> = {
      method,
      url,
      query: maskedQuery,
      userId,
      ip,
    };

    // In development, include masked request body
    if (this.isDevelopment() && request.body) {
      logContext.body = this.maskSensitiveData(request.body as Record<string, unknown>);
    }

    this.logger.log(`Incoming request: ${method} ${url}`, JSON.stringify(logContext));

    return next.handle().pipe(
      tap({
        next: (data: unknown) => {
          const duration = Date.now() - startTime;
          const response = ctx.getResponse<Response>();
          const statusCode = response.statusCode;
          const responseSize = this.getResponseSize(data);

          const logLevel = this.getLogLevel(statusCode);
          const message = `Response: ${method} ${url} -> ${statusCode} (${duration}ms, ${responseSize} bytes)`;

          const responseContext: Record<string, unknown> = {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            responseSize: `${responseSize} bytes`,
            userId,
          };

          this.logger[logLevel](message, JSON.stringify(responseContext));
        },
        error: (error: unknown) => {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const message = `Error: ${method} ${url} -> ${errorMessage} (${duration}ms)`;

          const errorContext: Record<string, unknown> = {
            method,
            url,
            duration: `${duration}ms`,
            userId,
            error: errorMessage,
          };

          this.logger.error(message, JSON.stringify(errorContext));
        },
      }),
    );
  }

  /**
   * Маскирует чувствительные данные в объекте.
   */
  private maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        masked[key] = this.maskSensitiveData(value as Record<string, unknown>);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  /**
   * Определяет уровень логирования по статус-коду.
   */
  private getLogLevel(statusCode: number): 'log' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'log';
  }

  /**
   * Оценивает размер ответа в байтах.
   */
  private getResponseSize(data: unknown): number {
    if (data === null || data === undefined) return 0;
    if (Buffer.isBuffer(data)) return data.length;
    if (typeof data === 'string') return Buffer.byteLength(data, 'utf8');

    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Проверяет, запущено ли приложение в development режиме.
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}
