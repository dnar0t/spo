/**
 * CreateNotificationTemplateUseCase
 *
 * Создание нового шаблона уведомления.
 * - Проверяет уникальность eventName
 * - Сохраняет шаблон
 * - Логирует действие в аудит
 */
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { ConflictError } from '../../../domain/errors/domain.error';

export interface CreateNotificationTemplateDto {
  eventName: string;
  subject: string;
  body: string;
  isActive?: boolean;
}

export class CreateNotificationTemplateUseCase {
  constructor(
    private readonly notificationTemplateRepository: NotificationTemplateRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: CreateNotificationTemplateDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<NotificationTemplate> {
    // 1. Проверяем уникальность eventName
    const existing = await this.notificationTemplateRepository.findByEventName(dto.eventName);
    if (existing) {
      throw new ConflictError(
        `Notification template with eventName "${dto.eventName}" already exists`,
      );
    }

    // 2. Создаём шаблон
    const template = NotificationTemplate.create({
      eventName: dto.eventName,
      subject: dto.subject,
      body: dto.body,
      isActive: dto.isActive,
    });

    // 3. Сохраняем
    const saved = await this.notificationTemplateRepository.save(template);

    // 4. Логируем в аудит
    await this.auditLogger.log({
      userId,
      action: 'CREATE_NOTIFICATION_TEMPLATE',
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
