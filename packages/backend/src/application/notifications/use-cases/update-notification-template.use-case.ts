/**
 * UpdateNotificationTemplateUseCase
 *
 * Обновление шаблона уведомления.
 * - Проверяет существование шаблона
 * - Обновляет поля
 * - Логирует действие в аудит
 */
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface UpdateNotificationTemplateDto {
  eventName?: string;
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export class UpdateNotificationTemplateUseCase {
  constructor(
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    id: string,
    dto: UpdateNotificationTemplateDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<NotificationTemplate> {
    // 1. Проверяем, что шаблон существует
    const template = await this.notificationTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundError('NotificationTemplate', id);
    }

    // 2. Если меняется eventName, проверяем уникальность
    if (dto.eventName && dto.eventName !== template.eventName) {
      const existing = await this.notificationTemplateRepository.findByEventName(dto.eventName);
      if (existing) {
        throw new Error(`Notification template with eventName "${dto.eventName}" already exists`);
      }
    }

    // 3. Обновляем шаблон
    template.update({
      eventName: dto.eventName,
      subject: dto.subject,
      body: dto.body,
      isActive: dto.isActive,
    });

    // 4. Сохраняем
    const saved = await this.notificationTemplateRepository.update(template);

    // 5. Логируем в аудит
    await this.auditLogger.log({
      userId,
      action: 'UPDATE_NOTIFICATION_TEMPLATE',
      entityType: 'NotificationTemplate',
      entityId: saved.id,
      details: {
        eventName: dto.eventName,
        subject: dto.subject,
        isActive: dto.isActive,
      },
      ipAddress,
      userAgent,
    });

    return saved;
  }
}
