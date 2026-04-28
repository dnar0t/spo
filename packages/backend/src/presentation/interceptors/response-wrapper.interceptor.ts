/**
 * ResponseWrapperInterceptor
 *
 * Глобальный interceptor, который оборачивает ВСЕ успешные ответы
 * в консистентный формат: { success: true, data: <original_response> }
 *
 * Исключения:
 * - Health check endpoint (/api/health) — возвращается как есть
 * - File download endpoints (StreamableFile / Buffer) — определяются по типу ответа
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class ResponseWrapperInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseWrapperInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Skip health check endpoint
    if (request.url === '/api/health') {
      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - startTime;
          request.res?.setHeader('X-Response-Time', `${duration}ms`);
        }),
      );
    }

    return next.handle().pipe(
      map((data) => {
        // Skip if response is null/undefined (e.g., 204 No Content)
        if (data === null || data === undefined) {
          return data;
        }

        // Skip StreamableFile (file downloads)
        if (data instanceof StreamableFile) {
          return data;
        }

        // Skip Buffer responses (file downloads)
        if (Buffer.isBuffer(data)) {
          return data;
        }

        // If already wrapped, return as-is (prevent double-wrap)
        if (
          typeof data === 'object' &&
          data !== null &&
          'success' in data &&
          data.success === true &&
          'data' in data
        ) {
          return data;
        }

        return {
          success: true,
          data,
        };
      }),
      tap(() => {
        const duration = Date.now() - startTime;
        request.res?.setHeader('X-Response-Time', `${duration}ms`);
      }),
    );
  }
}
