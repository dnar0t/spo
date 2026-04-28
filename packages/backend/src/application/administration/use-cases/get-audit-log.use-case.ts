/**
 * GetAuditLogUseCase
 *
 * Use case для получения журнала аудита с пагинацией и фильтрацией.
 */
import { IAuditLogger } from '../../auth/ports/audit-logger';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface PaginatedAuditLogResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetAuditLogUseCase {
  constructor(
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(query: AuditLogQuery): Promise<PaginatedAuditLogResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    // Примечание: в реальном проекте здесь был бы репозиторий AuditLogRepository
    // для прямого доступа к БД. Сейчас используем заглушку, так как IAuditLogger
    // предоставляет только метод log(), без возможности чтения.
    // В production нужно будет создать AuditLogRepository.

    // TODO: Заменить на AuditLogRepository, когда он будет создан
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}
