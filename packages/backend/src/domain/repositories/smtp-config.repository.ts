/**
 * SmtpConfig Repository Interface (Port)
 *
 * Определяет контракт для работы с SMTP конфигурацией в domain layer.
 * Реализация находится в infrastructure слое (Prisma / env).
 */
import { SmtpConfig } from '../entities/smtp-config.entity';
import { BaseRepository } from './base.repository';

export interface SmtpConfigRepository extends BaseRepository<SmtpConfig, string> {
  /** Найти активную SMTP конфигурацию */
  findActive(): Promise<SmtpConfig | null>;
}
