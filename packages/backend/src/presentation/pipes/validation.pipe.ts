/**
 * CustomValidationPipe
 *
 * Расширение стандартного ValidationPipe из NestJS.
 * Переопределяет фабрику исключений, чтобы выбрасывать InvalidArgumentError
 * вместо NestJS BadRequestException.
 *
 * Это позволяет:
 * - Обрабатывать ошибки валидации через GlobalExceptionFilter
 * - Получать консистентный формат ошибок
 * - Мапить пути class-validator на человекочитаемые имена полей
 */
import {
  ValidationPipe,
  ValidationPipeOptions,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { InvalidArgumentError } from '../../domain/errors/domain.error';

export class CustomValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      ...options,
      exceptionFactory: (errors: ValidationError[]) => {
        const firstError = errors[0];
        const message = extractFirstErrorMessage(firstError);
        const fieldName = firstError.property;
        const constraints = firstError.constraints ?? {};

        return new InvalidArgumentError(fieldName, message, {
          field: fieldName,
          constraints: Object.keys(constraints),
          totalErrors: errors.length,
        });
      },
    });
  }
}

/**
 * Извлекает первое сообщение об ошибке из ValidationError.
 * Рекурсивно обходит вложенные ошибки (для вложенных DTO).
 */
function extractFirstErrorMessage(error: ValidationError): string {
  // Direct constraints on this property
  if (error.constraints) {
    const messages = Object.values(error.constraints);
    if (messages.length > 0) {
      return messages[0];
    }
  }

  // Nested validation errors
  if (error.children && error.children.length > 0) {
    for (const child of error.children) {
      const childMessage = extractFirstErrorMessage(child);
      if (childMessage) {
        return `${error.property}.${childMessage}`;
      }
    }
  }

  return `Validation failed for "${error.property}"`;
}
