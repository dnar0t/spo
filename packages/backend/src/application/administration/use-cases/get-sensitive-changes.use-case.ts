/**
 * GetSensitiveChangesUseCase
 *
 * Use case для получения журнала аудита по чувствительным действиям
 * (создание/редактирование пользователей, назначение ролей, ставки, формулы, интеграции).
 */
import { AuditLogRepository } from '../../../domain/repositories/audit-log.repository';

export interface GetSensitiveChangesQuery {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedSensitiveChangesResult {
  items: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string | null;
    changes: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetSensitiveChangesUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(params: GetSensitiveChangesQuery): Promise<PaginatedSensitiveChangesResult> {
    const sensitiveActions = [
      'USER_CREATED',
      'USER_UPDATED',
      'ROLES_ASSIGNED',
      'RATE_CREATED',
      'RATE_DELETED',
      'FORMULA_UPDATED',
      'INTEGRATION_UPDATED',
    ];

    const rawResult = await this.auditLogRepository.findMany({
      action: { in: sensitiveActions },
      createdAt: {
        gte: params.dateFrom ? new Date(params.dateFrom) : undefined,
        lte: params.dateTo ? new Date(params.dateTo) : undefined,
      },
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });

    return {
      ...rawResult,
      items: rawResult.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}
