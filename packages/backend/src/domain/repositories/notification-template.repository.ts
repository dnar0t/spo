/**
 * NotificationTemplate Repository Interface (Port)
 *
 * Определяет контракт для работы с шаблонами уведомлений в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { NotificationTemplate } from '../entities/notification-template.entity';
import { BaseRepository } from './base.repository';

export interface NotificationTemplateRepository extends BaseRepository<NotificationTemplate, string> {
  /** Найти шаблон по имени события */
  findByEventName(eventName: string): Promise<NotificationTemplate | null>;

  /** Найти активный шаблон по имени события */
  findActiveByEventName(eventName: string): Promise<NotificationTemplate | null>;
}
