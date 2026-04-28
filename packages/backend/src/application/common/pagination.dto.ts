/**
 * Pagination DTOs
 *
 * Базовые типы для пагинации в use cases.
 * Используются во всех запросах, возвращающих списки с постраничной выдачей.
 */

export interface PaginationDto {
  /** Номер страницы (1-based) */
  page: number;

  /** Количество элементов на странице */
  limit: number;

  /** Сортировка: поле, по которому сортируем */
  sortBy?: string;

  /** Направление сортировки */
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  /** Элементы текущей страницы */
  items: T[];

  /** Общее количество элементов (по всем страницам) */
  total: number;

  /** Номер текущей страницы */
  page: number;

  /** Количество элементов на странице */
  limit: number;

  /** Общее количество страниц */
  totalPages: number;

  /** Есть ли следующая страница */
  hasNextPage: boolean;

  /** Есть ли предыдущая страница */
  hasPreviousPage: boolean;
}

/** Вспомогательная функция для вычисления метаинформации пагинации */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: PaginationDto,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1,
  };
}
