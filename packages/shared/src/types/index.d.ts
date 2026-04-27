export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;
export type ID = number;
export type Money = number;
export type Minutes = number;
export type BasisPoints = number;
export interface PaginationParams {
    page: number;
    limit: number;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: Record<string, unknown>;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface UserIdentity {
    id: UUID;
    email: string;
    fullName: string;
    role: import('../constants').Role;
}
export interface DateRange {
    start: ISODate;
    end: ISODate;
}
