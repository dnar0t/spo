/**
 * EmailSenderService
 *
 * Реализация IEmailSender с использованием Nodemailer.
 * - Читает SMTP конфигурацию из репозитория
 * - Создаёт transporter для каждого вызова send
 * - Gracefully обрабатывает ошибки подключения
 *
 * Если пакет nodemailer не установлен, сервис логирует предупреждение
 * и работает в режиме "dry run" (не отправляет реальные письма).
 */
import { Injectable, Logger } from '@nestjs/common';
import { IEmailSender } from '../../application/notifications/ports/email-sender';
import { PrismaSmtpConfigRepository } from '../prisma/repositories/prisma-smtp-config.repository';
import { EncryptionService } from '../auth/encryption.service';

// Пытаемся импортировать nodemailer; если не установлен — используем заглушку
let nodemailer: any = null;
try {
  nodemailer = require('nodemailer');
} catch {
  // nodemailer not installed, will use dry-run mode
}

@Injectable()
export class EmailSenderService implements IEmailSender {
  private readonly logger = new Logger(EmailSenderService.name);
  private readonly isDryRun: boolean;

  constructor(
    private readonly smtpConfigRepository: PrismaSmtpConfigRepository,
    private readonly encryptionService: EncryptionService,
  ) {
    this.isDryRun = nodemailer === null;
    if (this.isDryRun) {
      this.logger.warn(
        'Nodemailer package is not installed. EmailSenderService will run in dry-run mode. ' +
          'Install nodemailer to enable actual email sending: npm install nodemailer',
      );
    }
  }

  async send(params: { to: string; subject: string; body: string; html?: string }): Promise<void> {
    // 1. Получаем активную SMTP конфигурацию
    const smtpConfig = await this.smtpConfigRepository.findActive();

    if (!smtpConfig) {
      this.logger.warn(
        `Cannot send email to "${params.to}": No active SMTP configuration found. ` +
          'Please configure SMTP settings via the admin API.',
      );
      return;
    }

    // 2. Dry-run режим
    if (this.isDryRun) {
      this.logger.log(
        `[DRY-RUN] Email to: ${params.to}, subject: "${params.subject}", body length: ${params.body.length} chars`,
      );
      return;
    }

    try {
      // 3. Расшифровываем пароль
      const password = this.encryptionService.decrypt(smtpConfig.encryptedPassword);

      // 4. Создаём transporter
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.username,
          pass: password,
        },
        // Таймауты для избегания зависаний
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // 5. Отправляем письмо
      await transporter.sendMail({
        from: `"${smtpConfig.senderName}" <${smtpConfig.senderEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html ?? undefined,
      });

      this.logger.log(`Email sent successfully to "${params.to}" with subject "${params.subject}"`);

      // Закрываем соединение
      transporter.close();
    } catch (error) {
      this.logger.error(
        `Failed to send email to "${params.to}": ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
