/**
 * Base domain error class
 * Все ошибки домена должны наследоваться от этого класса
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Maintain proper stack trace in V8
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for not found entities
 */
export class NotFoundError extends DomainError {
  constructor(entityName: string, id: string | number, details?: Record<string, unknown>) {
    super(
      `${entityName} with id "${id}" not found`,
      'NOT_FOUND',
      { entityName, id, ...details },
    );
  }
}

/**
 * Error for invalid domain state
 */
export class DomainStateError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_STATE', details);
  }
}

/**
 * Error for business rule violations
 */
export class BusinessRuleError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', details);
  }
}

/**
 * Error for invalid arguments
 */
export class InvalidArgumentError extends DomainError {
  constructor(argumentName: string, reason: string, details?: Record<string, unknown>) {
    super(
      `Invalid argument "${argumentName}": ${reason}`,
      'INVALID_ARGUMENT',
      { argumentName, reason, ...details },
    );
  }
}

/**
 * Error for unauthorized operations
 */
export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized access', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', details);
  }
}

/**
 * Error for conflicting operations
 */
export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', details);
  }
}
