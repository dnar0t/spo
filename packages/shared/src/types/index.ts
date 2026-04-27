// ============================================
// Базовые типы СПО
// ============================================

/** UUID строка */
export type UUID = string;

/** ISO 8601 дата-время */
export type ISODateTime = string;

/** ISO 8601 дата (YYYY-MM-DD) */
export type ISODate = string;

/** Целое неотрицательное число (идентификаторы, счётчики) */
export type ID = number;

/** Деньги в минимальных единицах (копейки/центы) — Int64 */
export type Money = number;

/** Часы в целых минутах (чтобы избежать Float) */
export type Minutes = number;

/** Проценты * 100 (например, 12.5% = 1250) — int32 */
export type BasisPoints = number;

/** Generic pagination */
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

/** Generic API response */
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

/** User identity (без пароля) */
export interface UserIdentity {
  id: UUID;
  email: string;
  fullName: string;
  role: import('../constants').Role;
}

/** Date range */
export interface DateRange {
  start: ISODate;
  end: ISODate;
}
