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
      secret?: string;
      login?: string;
      password?: string;
      baseDn?: string;
      bindDn?: string;
      notes?: string;
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
    let existing = await this.prisma.integrationSettings.findUnique({
      where: { id },
    });

    // Если записи нет — создаём новую (для LDAP и других кастомных интеграций)
    if (!existing) {
      existing = await this.prisma.integrationSettings.create({
        data: {
          id,
          baseUrl: '',
          apiTokenEncrypted: '',
          projects: [],
          isActive: true,
        },
      });
    }

    // 2. Формируем данные для обновления (только переданные поля)
    const updateData: Record<string, unknown> = {};
    if (dto.baseUrl !== undefined) updateData.baseUrl = dto.baseUrl;

    // Map frontend `secret` → store as `apiTokenEncrypted`
    // (только для YouTrack, не для LDAP — у LDAP secret идёт в extensions)
    // Токен хранится без шифрования (расшифровка не реализована в клиенте)
    if (id !== 'ldap') {
      if (dto.secret !== undefined) {
        updateData.apiTokenEncrypted = dto.secret;
      } else if (dto.apiTokenEncrypted !== undefined) {
        updateData.apiTokenEncrypted = dto.apiTokenEncrypted;
      }
    }

    // Map frontend `notes` → store in `extensions` JSON field (merge with existing)
    if (dto.notes !== undefined) {
      const existingExtensions =
        typeof existing.extensions === 'object' && existing.extensions !== null
          ? (existing.extensions as Record<string, unknown>)
          : {};
      updateData.extensions = {
        ...existingExtensions,
        notes: dto.notes,
      };
    }

    // LDAP-specific fields stored in extensions
    if (id === 'ldap') {
      const existingExtensions =
        typeof existing.extensions === 'object' && existing.extensions !== null
          ? (existing.extensions as Record<string, unknown>)
          : {};

      // Если передан baseUrl для LDAP — разбираем host:port
      if (dto.baseUrl !== undefined && dto.baseUrl) {
        const parts = dto.baseUrl.split(':');
        existingExtensions.host = parts[0];
        existingExtensions.port = parts.length > 1 ? parseInt(parts[1], 10) || 389 : 389;
      }

      // Если передан secret — это bindPassword для LDAP
      if (dto.secret !== undefined) {
        existingExtensions.bindPassword = dto.secret || '';
      }

      // Если передан password — это bindPassword для LDAP
      if (dto.password !== undefined) {
        existingExtensions.bindPassword = dto.password || '';
      }

      // Если передан login — это bind DN или login для LDAP
      if (dto.login !== undefined) {
        existingExtensions.login = dto.login || '';
      }

      // Если передан baseDn — это base DN для LDAP
      if (dto.baseDn !== undefined) {
        existingExtensions.baseDn = dto.baseDn || '';
      }

      // Если передан bindDn — это bind DN для LDAP
      if (dto.bindDn !== undefined) {
        existingExtensions.bindDn = dto.bindDn || '';
      }

      updateData.extensions = existingExtensions;
    }
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
