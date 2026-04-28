/**
 * UpdateSmtpConfigUseCase
 *
 * Обновление SMTP конфигурации.
 * - Шифрует пароль с помощью IEncryptionService
 * - Сохраняет конфигурацию
 * - Логирует действие в аудит
 */
import { SmtpConfigRepository } from '../../../domain/repositories/smtp-config.repository';
import { SmtpConfig } from '../../../domain/entities/smtp-config.entity';
import { IEncryptionService } from '../../auth/ports/encryption.service';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface UpdateSmtpConfigDto {
  host: string;
  port: number;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
  isActive?: boolean;
}

export class UpdateSmtpConfigUseCase {
  constructor(
    private readonly smtpConfigRepository: SmtpConfigRepository,
    private readonly encryptionService: IEncryptionService,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: UpdateSmtpConfigDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SmtpConfig> {
    // 1. Шифруем пароль
    const encryptedPassword = this.encryptionService.encrypt(dto.password);

    // 2. Ищем существующую конфигурацию
    const allConfigs = await this.smtpConfigRepository.findAll();
    const existingConfig = allConfigs.length > 0 ? allConfigs[0] : null;

    let savedConfig: SmtpConfig;

    if (existingConfig) {
      // Обновляем существующую
      existingConfig.update({
        host: dto.host,
        port: dto.port,
        username: dto.username,
        encryptedPassword,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        isActive: dto.isActive,
      });

      savedConfig = await this.smtpConfigRepository.update(existingConfig);
    } else {
      // Создаём новую
      const newConfig = SmtpConfig.create({
        host: dto.host,
        port: dto.port,
        username: dto.username,
        encryptedPassword,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        isActive: dto.isActive ?? true,
      });

      savedConfig = await this.smtpConfigRepository.save(newConfig);
    }

    // 3. Логируем в аудит
    await this.auditLogger.log({
      userId,
      action: 'UPDATE_SMTP_CONFIG',
      entityType: 'SmtpConfig',
      entityId: savedConfig.id,
      details: {
        host: dto.host,
        port: dto.port,
        username: dto.username,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        isActive: dto.isActive,
      },
      ipAddress,
      userAgent,
    });

    return savedConfig;
  }
}
