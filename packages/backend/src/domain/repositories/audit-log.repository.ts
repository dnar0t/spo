/**
 * AuditLogRepository Interface (Port)
 *
 * Определяет контракт для работы с записями аудита в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
export interface AuditLogFindManyParams {
  action?: { in: string[] };
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  page?: number;
  limit?: number;
}

export interface AuditLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PaginatedAuditLogResult {
  items: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogRepository {
  /** Найти записи аудита с фильтрацией и пагинацией */
  findMany(params: AuditLogFindManyParams): Promise<PaginatedAuditLogResult>;
}
