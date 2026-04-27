export declare abstract class DomainError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends DomainError {
    constructor(entityName: string, id: string | number, details?: Record<string, unknown>);
}
export declare class DomainStateError extends DomainError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class BusinessRuleError extends DomainError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class InvalidArgumentError extends DomainError {
    constructor(argumentName: string, reason: string, details?: Record<string, unknown>);
}
export declare class UnauthorizedError extends DomainError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class ConflictError extends DomainError {
    constructor(message: string, details?: Record<string, unknown>);
}
