/**
 * PrismaAuditLogRepository
 *
 * Реализация AuditLogRepository для работы с таблицей audit_logs через Prisma.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogRepository, AuditLogFindManyParams, PaginatedAuditLogResult, AuditLogRecord } from '../../../domain/repositories/audit-log.repository';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: AuditLogFindManyParams): Promise<PaginatedAuditLogResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.action?.in) {
      where.action = { in: params.action.in };
    }

    if (params.createdAt) {
      const createdAtFilter: any = {};
      if (params.createdAt.gte) {
        createdAtFilter.gte = params.createdAt.gte;
      }
      if (params.createdAt.lte) {
        createdAtFilter.lte = params.createdAt.lte;
      }
      if (Object.keys(createdAtFilter).length > 0) {
        where.createdAt = createdAtFilter;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((record) => this.toDomain(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toDomain(record: any): AuditLogRecord {
    return {
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      userId: record.userId,
      changes: record.changes as Record<string, unknown> | null,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt,
    };
  }
}
