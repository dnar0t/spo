/**
 * GetNotificationTemplatesUseCase
 *
 * Получение списка всех шаблонов уведомлений.
 */
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';

export class GetNotificationTemplatesUseCase {
  constructor(
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
  ) {}

  async execute(): Promise<NotificationTemplate[]> {
    return this.notificationTemplateRepository.findAll();
  }
}
