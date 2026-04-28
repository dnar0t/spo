/**
 * SendNotificationUseCase
 *
 * Отправка уведомления пользователю.
 * - Ищет шаблон по имени события
 * - Рендерит шаблон с переменными
 * - Отправляет email через IEmailSender
 * - Создаёт запись NotificationRun
 * - Не выбрасывает исключение при ошибке отправки, а маркирует run как FAILED
 * - Логирует действие в аудит
 */
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { NotificationRunRepository } from '../../../domain/repositories/notification-run.repository';
import { NotificationRun } from '../../../domain/entities/notification-run.entity';
import { IEmailSender } from '../ports/email-sender';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface SendNotificationDto {
  eventName: string;
  recipientId: string;
  recipientEmail: string;
  variables: Record<string, string>;
  templateId?: string;
}

export interface SendNotificationResult {
  runId: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

export class SendNotificationUseCase {
  constructor(
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly notificationRunRepository: NotificationRunRepository,
    private readonly emailSender: IEmailSender,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: SendNotificationDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SendNotificationResult> {
    // 1. Ищем шаблон по имени события
    let template = await this.notificationTemplateRepository.findActiveByEventName(dto.eventName);

    if (!template) {
      // Если нет активного шаблона, создаём run с FAILED статусом
      const failedRun = NotificationRun.create({
        eventName: dto.eventName,
        recipientId: dto.recipientId,
        templateId: dto.templateId ?? null,
        status: 'FAILED',
      });
      failedRun.markFailed(`No active template found for event "${dto.eventName}"`);

      await this.notificationRunRepository.save(failedRun);

      return {
        runId: failedRun.id,
        status: 'FAILED',
        error: `No active template found for event "${dto.eventName}"`,
      };
    }

    // 2. Рендерим шаблон с переменными
    const rendered = template.render(dto.variables);

    // 3. Создаём запись NotificationRun (PENDING)
    const run = NotificationRun.create({
      templateId: template.id,
      eventName: dto.eventName,
      recipientId: dto.recipientId,
    });

    const savedRun = await this.notificationRunRepository.save(run);

    try {
      // 4. Отправляем email
      await this.emailSender.send({
        to: dto.recipientEmail,
        subject: rendered.subject,
        body: rendered.body,
        html: rendered.body.replace(/\n/g, '<br/>'),
      });

      // 5. Отмечаем как отправленное
      savedRun.markSent();
      await this.notificationRunRepository.update(savedRun);

      // 6. Логируем в аудит
      await this.auditLogger.log({
        userId,
        action: 'SEND_NOTIFICATION',
        entityType: 'NotificationRun',
        entityId: savedRun.id,
        details: {
          eventName: dto.eventName,
          recipientId: dto.recipientId,
          recipientEmail: dto.recipientEmail,
          templateId: template.id,
          subject: rendered.subject,
        },
        ipAddress,
        userAgent,
      });

      return {
        runId: savedRun.id,
        status: 'SENT',
      };
    } catch (error) {
      // 7. Если отправка не удалась — помечаем как FAILED
      const errorMessage = error instanceof Error ? error.message : 'Unknown email sending error';
      savedRun.markFailed(errorMessage);
      await this.notificationRunRepository.update(savedRun);

      // 8. Логируем ошибку в аудит
      await this.auditLogger.log({
        userId,
        action: 'SEND_NOTIFICATION_FAILED',
        entityType: 'NotificationRun',
        entityId: savedRun.id,
        details: {
          eventName: dto.eventName,
          recipientId: dto.recipientId,
          recipientEmail: dto.recipientEmail,
          templateId: template.id,
          error: errorMessage,
        },
        ipAddress,
        userAgent,
      });

      return {
        runId: savedRun.id,
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }
}
