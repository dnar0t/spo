/**
 * GetSmtpConfigUseCase
 *
 * Получение SMTP конфигурации.
 * - Маскирует пароль перед возвратом
 * - Если конфигурации нет, возвращает null
 */
import { SmtpConfigRepository } from '../../../domain/repositories/smtp-config.repository';
import { IEncryptionService } from '../../auth/ports/encryption.service';

export interface SmtpConfigResponse {
  id: string;
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  senderName: string;
  senderEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GetSmtpConfigUseCase {
  constructor(
    private readonly smtpConfigRepository: SmtpConfigRepository,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(): Promise<SmtpConfigResponse | null> {
    const allConfigs = await this.smtpConfigRepository.findAll();
    const config = allConfigs.length > 0 ? allConfigs[0] : null;

    if (!config) {
      return null;
    }

    // Маскируем пароль: показываем только первые 4 символа
    const decryptedPassword = this.encryptionService.decrypt(config.encryptedPassword);
    const maskedPassword =
      decryptedPassword.length > 4
        ? decryptedPassword.substring(0, 4) + '****'
        : '****';

    return {
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      passwordMasked: maskedPassword,
      senderName: config.senderName,
      senderEmail: config.senderEmail,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
