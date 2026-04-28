import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IAuditLogger } from '../../application/auth/ports/audit-logger';

@Injectable()
export class AuditLogger implements IAuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? '',
          changes: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
          metadata: {
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Audit should never break the main flow
      this.logger.error(
        `Failed to write audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
