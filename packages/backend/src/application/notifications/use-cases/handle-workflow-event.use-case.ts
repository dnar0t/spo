/**
 * HandleWorkflowEventUseCase
 *
 * Обработчик доменных событий для отправки уведомлений.
 * Координирует: поиск шаблона для события → отправка уведомлений
 * соответствующим пользователям.
 *
 * Поддерживаемые события:
 * - PlanFixedEvent — план зафиксирован
 * - FactLoadedEvent — фактические данные загружены
 * - PeriodClosedEvent — период закрыт
 * - PeriodReopenedEvent — период переоткрыт
 *
 * Вызывается вручную из workflow use cases (планируется замена на EventBus).
 */
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { IEmailSender } from '../ports/email-sender';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { SendNotificationUseCase } from './send-notification.use-case';

export interface WorkflowEventPayload {
  eventName: string;
  periodId: string;
  triggeredByUserId: string;
  additionalVariables?: Record<string, string>;
}

export class HandleWorkflowEventUseCase {
  constructor(
    private readonly sendNotificationUseCase: SendNotificationUseCase,
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly userRepository: UserRepository,
    private readonly emailSender: IEmailSender,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * Обработать доменное событие и отправить уведомления.
   *
   * @param payload - данные события
   * @returns количество отправленных уведомлений
   */
  async execute(payload: WorkflowEventPayload): Promise<{ sent: number; failed: number }> {
    // 1. Проверяем, есть ли шаблон для этого события
    const template = await this.notificationTemplateRepository.findActiveByEventName(
      payload.eventName,
    );

    if (!template) {
      // Нет шаблона — не отправляем уведомления
      return { sent: 0, failed: 0 };
    }

    // 2. Определяем получателей в зависимости от события
    const recipients = await this.getRecipientsForEvent(payload);

    if (recipients.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // 3. Отправляем уведомления каждому получателю
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const variables: Record<string, string> = {
        ...payload.additionalVariables,
        periodId: payload.periodId,
        recipientName: recipient.fullName ?? recipient.login,
        recipientEmail: recipient.email ?? '',
      };

      const result = await this.sendNotificationUseCase.execute(
        {
          eventName: payload.eventName,
          recipientId: recipient.id,
          recipientEmail: recipient.email ?? '',
          variables,
          templateId: template.id,
        },
        payload.triggeredByUserId,
      );

      if (result.status === 'SENT') {
        sent++;
      } else {
        failed++;
      }
    }

    // 4. Логируем результат обработки события
    await this.auditLogger.log({
      userId: payload.triggeredByUserId,
      action: 'HANDLE_WORKFLOW_EVENT',
      entityType: 'NotificationTemplate',
      entityId: template.id,
      details: {
        eventName: payload.eventName,
        periodId: payload.periodId,
        recipientCount: recipients.length,
        sent,
        failed,
      },
    });

    return { sent, failed };
  }

  /**
   * Определить получателей уведомления в зависимости от типа события.
   */
  private async getRecipientsForEvent(
    payload: WorkflowEventPayload,
  ): Promise<Array<{ id: string; login: string; fullName: string | null; email: string | null }>> {
    // Получаем всех активных пользователей с email
    const allUsers = await this.userRepository.findAllActive();

    // Фильтруем только тех, у кого есть email
    const usersWithEmail = allUsers.filter((user) => user.email);

    // В будущем здесь можно добавить более сложную логику:
    // - PlanFixed → уведомляем всех участников периода
    // - FactLoaded → уведомляем менеджеров и директоров
    // - PeriodClosed → уведомляем всех причастных
    // - PeriodReopened → уведомляем администраторов

    return usersWithEmail.map((user) => ({
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      email: user.email,
    }));
  }
}
