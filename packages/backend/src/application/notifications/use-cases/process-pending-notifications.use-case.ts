/**
 * ProcessPendingNotificationsUseCase
 *
 * Обработка всех PENDING уведомлений (для queue worker).
 * - Загружает все PENDING записи
 * - Пытается отправить email для каждой
 * - Отмечает как SENT или FAILED
 * - Не выбрасывает исключения при ошибках отдельных отправок
 */
import { NotificationRunRepository } from '../../../domain/repositories/notification-run.repository';
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { IEmailSender } from '../ports/email-sender';
import { IAuditLogger } from '../../auth/ports/audit-logger';

export class ProcessPendingNotificationsUseCase {
  constructor(
    private readonly notificationRunRepository: NotificationRunRepository,
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly emailSender: IEmailSender,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(): Promise<{ processed: number; succeeded: number; failed: number }> {
    // 1. Загружаем все PENDING записи
    const pendingRuns = await this.notificationRunRepository.findPending();

    let succeeded = 0;
    let failed = 0;

    for (const run of pendingRuns) {
      try {
        // 2. Ищем шаблон (если указан templateId)
        let subject = '';
        let body = '';

        if (run.templateId) {
          const template = await this.notificationTemplateRepository.findById(run.templateId);
          if (template) {
            const rendered = template.render({});
            subject = rendered.subject;
            body = rendered.body;
          }
        }

        if (!subject) {
          subject = `Notification: ${run.eventName}`;
        }
        if (!body) {
          body = `Event: ${run.eventName}\nRecipient: ${run.recipientId}`;
        }

        // 3. Отправляем email
        await this.emailSender.send({
          to: run.recipientId, // В production здесь должен быть email получателя
          subject,
          body,
        });

        // 4. Отмечаем как отправленное
        run.markSent();
        await this.notificationRunRepository.update(run);
        succeeded++;
      } catch (error) {
        // 5. При ошибке отмечаем как FAILED
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        run.markFailed(errorMessage);
        await this.notificationRunRepository.update(run);
        failed++;
      }
    }

    // 6. Логируем результат
    if (pendingRuns.length > 0) {
      await this.auditLogger.log({
        userId: 'system',
        action: 'PROCESS_PENDING_NOTIFICATIONS',
        entityType: 'NotificationRun',
        entityId: 'batch',
        details: {
          total: pendingRuns.length,
          succeeded,
          failed,
        },
      });
    }

    return {
      processed: pendingRuns.length,
      succeeded,
      failed,
    };
  }
}
