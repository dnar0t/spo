/**
 * GlobalExceptionFilter
 *
 * Глобальный фильтр исключений для всего приложения.
 * Перехватывает ВСЕ необработанные исключения и возвращает
 * консистентный JSON-ответ.
 *
 * Мапит доменные ошибки (DomainError) на HTTP статус-коды.
 * В development режиме включает stack trace в ответ.
 * В production режиме скрывает детали внутренних ошибок.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  DomainError,
  NotFoundError,
  DomainStateError,
  BusinessRuleError,
  InvalidArgumentError,
  UnauthorizedError,
  ConflictError,
} from '../../domain/errors/domain.error';
import { InvalidCredentialsError } from '../../domain/errors/auth.errors';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: object;
    timestamp: string;
    path: string;
    stack?: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = request.url;
    const method = request.method;
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: object | undefined;
    let stack: string | undefined;

    // ---- Domain Errors ----
    if (exception instanceof DomainError) {
      this.logger.warn(
        `[${method}] ${path} -> Domain error: ${exception.message} (code=${exception.code})`,
      );

      statusCode = this.mapDomainErrorToStatus(exception);
      code = exception.code;
      message = exception.message;
      details = exception.details;
      stack = exception.stack;

      this.buildAndSendResponse(response, statusCode, {
        success: false,
        error: {
          code,
          message,
          details,
          timestamp,
          path: `${method} ${path}`,
          ...(this.shouldIncludeStack() && stack ? { stack } : {}),
        },
      });
      return;
    }

    // ---- NestJS HttpException ----
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = `HTTP_ERROR`;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || `HTTP_${statusCode}`;
        details = resp.details as object | undefined;
        if (typeof resp.message === 'object') {
          // class-validator errors often have array of messages
          message = Array.isArray(resp.message)
            ? (resp.message as string[]).join('; ')
            : exception.message;
        }
      } else {
        message = exception.message;
        code = `HTTP_ERROR`;
      }

      this.logger.warn(`[${method}] ${path} -> HTTP ${statusCode}: ${message}`);

      this.buildAndSendResponse(response, statusCode, {
        success: false,
        error: {
          code,
          message:
            statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : message,
          details,
          timestamp,
          path: `${method} ${path}`,
          ...(this.shouldIncludeStack() && exception.stack ? { stack: exception.stack } : {}),
        },
      });
      return;
    }

    // ---- Unexpected / Unknown Errors ----
    const error = exception as Error;
    this.logger.error(
      `[${method}] ${path} -> Unhandled exception: ${error.message || 'Unknown error'}`,
      error.stack,
    );

    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal server error';
    code = 'INTERNAL_ERROR';
    stack = error.stack;

    this.buildAndSendResponse(response, statusCode, {
      success: false,
      error: {
        code,
        message,
        timestamp,
        path: `${method} ${path}`,
        ...(this.shouldIncludeStack() && stack ? { stack } : {}),
      },
    });
  }

  /**
   * Мапит доменную ошибку на HTTP статус-код.
   */
  private mapDomainErrorToStatus(error: DomainError): number {
    switch (true) {
      case error instanceof NotFoundError:
        return HttpStatus.NOT_FOUND;
      case error instanceof DomainStateError:
        return HttpStatus.CONFLICT;
      case error instanceof BusinessRuleError:
        return HttpStatus.UNPROCESSABLE_ENTITY;
      case error instanceof InvalidArgumentError:
        return HttpStatus.BAD_REQUEST;
      case error instanceof UnauthorizedError:
        return HttpStatus.FORBIDDEN;
      case error instanceof ConflictError:
        return HttpStatus.CONFLICT;
      case error instanceof InvalidCredentialsError:
        return HttpStatus.UNAUTHORIZED;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Проверяет, нужно ли включать stack trace в ответ.
   */
  private shouldIncludeStack(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Строит и отправляет HTTP-ответ.
   */
  private buildAndSendResponse(response: Response, statusCode: number, body: ErrorResponse): void {
    response.status(statusCode).json(body);
  }
}
