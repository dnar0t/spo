/**
 * PrismaSmtpConfigRepository
 *
 * Реализация SmtpConfigRepository с хранением SMTP конфигурации
 * в таблице integration_settings (с фиксированным идентификатором).
 *
 * SMTP конфигурация хранится как JSON в поле extensions записи
 * с ID '00000000-0000-0000-0000-000000000001'.
 *
 * В будущем при добавлении миграции следует создать отдельную таблицу
 * smtp_settings для более чистого хранения.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SmtpConfigRepository } from '../../../domain/repositories/smtp-config.repository';
import { SmtpConfig, SmtpConfigPersistenceData } from '../../../domain/entities/smtp-config.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

const SMTP_CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class PrismaSmtpConfigRepository implements SmtpConfigRepository {
  private readonly logger = new Logger(PrismaSmtpConfigRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Преобразует запись из integration_settings в SmtpConfig.
   * Данные хранятся в JSON-поле extensions (как Record<string, unknown>).
   */
  private toDomain(data: { id: string; extensions: Record<string, unknown> | null }): SmtpConfig {
    const ext = data.extensions as Record<string, unknown> | null;
    if (!ext) {
      throw new Error('SMTP config data is missing in integration_settings.extensions');
    }

    const persistenceData: SmtpConfigPersistenceData = {
      id: data.id,
      host: ext.host as string,
      port: ext.port as number,
      username: ext.username as string,
      encryptedPassword: ext.encryptedPassword as string,
      senderName: ext.senderName as string,
      senderEmail: ext.senderEmail as string,
      isActive: ext.isActive as boolean,
      createdAt: new Date(ext.createdAt as string),
      updatedAt: new Date(ext.updatedAt as string),
    };

    return SmtpConfig.fromPersistence(persistenceData);
  }

  /**
   * Преобразует SmtpConfig в формат для хранения в integration_settings.
   */
  private toExtensions(entity: SmtpConfig): Record<string, unknown> {
    const p = entity.toPersistence();
    return {
      host: p.host,
      port: p.port,
      username: p.username,
      encryptedPassword: p.encryptedPassword,
      senderName: p.senderName,
      senderEmail: p.senderEmail,
      isActive: p.isActive,
      createdAt: (p.createdAt as Date).toISOString(),
      updatedAt: (p.updatedAt as Date).toISOString(),
    };
  }

  /**
   * Получает или создаёт запись в integration_settings для хранения SMTP конфигурации.
   * Использует существующую запись YouTrack интеграции (с любым ID) или создаёт новую.
   */
  private async getOrCreateStorageRecord(): Promise<{ id: string; extensions: Record<string, unknown> | null }> {
    // Пытаемся найти существующую запись с SMTP-расширением
    const existing = await this.prisma.integrationSettings.findFirst({
      where: {
        extensions: {
          path: ['$', 'type'],
          equals: 'SMTP_CONFIG',
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Если нет, используем запись с фиксированным ID
    const record = await this.prisma.integrationSettings.findUnique({
      where: { id: SMTP_CONFIG_ID },
    });

    if (record) {
      return record;
    }

    // Создаём новую запись для хранения SMTP конфигурации
    const created = await this.prisma.integrationSettings.create({
      data: {
        id: SMTP_CONFIG_ID,
        baseUrl: '',
        apiTokenEncrypted: '',
        projects: [],
        extensions: {
          type: 'SMTP_CONFIG',
        },
      },
    });

    return created;
  }

  async findById(id: string): Promise<SmtpConfig | null> {
    try {
      const record = await this.prisma.integrationSettings.findUnique({
        where: { id },
      });

      if (!record || !this.hasSmtpConfig(record)) {
        return null;
      }

      return this.toDomain(record);
    } catch (error) {
      this.logger.error(`Failed to find SMTP config by id: ${(error as Error).message}`);
      return null;
    }
  }

  async findAll(): Promise<SmtpConfig[]> {
    try {
      const records = await this.prisma.integrationSettings.findMany();

      return records
        .filter((r) => this.hasSmtpConfig(r))
        .map((r) => this.toDomain(r));
    } catch (error) {
      this.logger.error(`Failed to find all SMTP configs: ${(error as Error).message}`);
      return [];
    }
  }

  async findActive(): Promise<SmtpConfig | null> {
    try {
      const allConfigs = await this.findAll();
      return allConfigs.find((config) => config.isActive) ?? null;
    } catch (error) {
      this.logger.error(`Failed to find active SMTP config: ${(error as Error).message}`);
      return null;
    }
  }

  async save(entity: SmtpConfig): Promise<SmtpConfig> {
    const record = await this.getOrCreateStorageRecord();
    const extensions = this.toExtensions(entity);

    const updated = await this.prisma.integrationSettings.update({
      where: { id: record.id },
      data: {
        extensions: {
          ...(record.extensions as Record<string, unknown> ?? {}),
          ...extensions,
          type: 'SMTP_CONFIG',
        },
      },
    });

    return this.toDomain(updated);
  }

  async update(entity: SmtpConfig): Promise<SmtpConfig> {
    return this.save(entity);
  }

  async delete(id: string): Promise<void> {
    try {
      const record = await this.prisma.integrationSettings.findUnique({
        where: { id },
      });

      if (record && this.hasSmtpConfig(record)) {
        await this.prisma.integrationSettings.update({
          where: { id },
          data: {
            extensions: {
              type: 'SMTP_CONFIG',
              deleted: true,
            },
          },
        });
      }
    } catch (error) {
      throw new NotFoundError('SmtpConfig', id);
    }
  }

  /**
   * Проверяет, содержит ли запись данные SMTP конфигурации.
   */
  private hasSmtpConfig(record: { extensions: Record<string, unknown> | null }): boolean {
    const ext = record.extensions as Record<string, unknown> | null;
    if (!ext) return false;
    return ext.type === 'SMTP_CONFIG' && !!ext.host && !!ext.username;
  }
}
