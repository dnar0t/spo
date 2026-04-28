/**
 * UpdateIntegrationUseCase
 *
 * Use case для обновления IntegrationSettings по ID.
 * Позволяет частичное обновление настроек интеграции.
 */
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { IAuditLogger } from '../../auth/ports/audit-logger';

export class UpdateIntegrationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    id: string,
    dto: {
      baseUrl?: string;
      apiTokenEncrypted?: string;
      projects?: string[];
      searchQuery?: string;
      agileBoardId?: string;
      sprintFieldId?: string;
      syncInterval?: string;
      batchSize?: number;
      requestTimeout?: number;
      retryCount?: number;
      errorEmail?: string;
      fieldMapping?: Record<string, unknown>;
      isActive?: boolean;
    },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    // 1. Проверяем существование записи
    const existing = await this.prisma.integrationSettings.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Integration settings not found: ${id}`);
    }

    // 2. Формируем данные для обновления (только переданные поля)
    const updateData: Record<string, unknown> = {};
    if (dto.baseUrl !== undefined) updateData.baseUrl = dto.baseUrl;
    if (dto.apiTokenEncrypted !== undefined) updateData.apiTokenEncrypted = dto.apiTokenEncrypted;
    if (dto.projects !== undefined) updateData.projects = dto.projects;
    if (dto.searchQuery !== undefined) updateData.searchQuery = dto.searchQuery;
    if (dto.agileBoardId !== undefined) updateData.agileBoardId = dto.agileBoardId;
    if (dto.sprintFieldId !== undefined) updateData.sprintFieldId = dto.sprintFieldId;
    if (dto.syncInterval !== undefined) updateData.syncInterval = dto.syncInterval;
    if (dto.batchSize !== undefined) updateData.batchSize = dto.batchSize;
    if (dto.requestTimeout !== undefined) updateData.requestTimeout = dto.requestTimeout;
    if (dto.retryCount !== undefined) updateData.retryCount = dto.retryCount;
    if (dto.errorEmail !== undefined) updateData.errorEmail = dto.errorEmail;
    if (dto.fieldMapping !== undefined) updateData.fieldMapping = dto.fieldMapping;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // 3. Обновляем запись
    const updated = await this.prisma.integrationSettings.update({
      where: { id },
      data: updateData,
    });

    // 4. Аудит
    const userId = context?.userId ?? 'system';
    await this.auditLogger.log({
      userId,
      action: 'INTEGRATION_UPDATED',
      entityType: 'IntegrationSettings',
      entityId: id,
      details: {
        changes: Object.keys(updateData),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 5. Формируем ответ
    return {
      id: updated.id,
      baseUrl: updated.baseUrl,
      projects: updated.projects,
      searchQuery: updated.searchQuery,
      agileBoardId: updated.agileBoardId,
      sprintFieldId: updated.sprintFieldId,
      syncInterval: updated.syncInterval,
      batchSize: updated.batchSize,
      requestTimeout: updated.requestTimeout,
      retryCount: updated.retryCount,
      errorEmail: updated.errorEmail,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
