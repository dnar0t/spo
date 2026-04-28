/**
 * NotificationRun Repository Interface (Port)
 *
 * Определяет контракт для работы с логами отправки уведомлений в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { NotificationRun } from '../entities/notification-run.entity';
import { BaseRepository } from './base.repository';

export interface NotificationRunRepository extends BaseRepository<NotificationRun, string> {
  /** Найти записи по ID получателя */
  findByRecipientId(recipientId: string): Promise<NotificationRun[]>;

  /** Найти записи по статусу */
  findByStatus(status: string): Promise<NotificationRun[]>;

  /** Найти записи по имени события */
  findByEventName(eventName: string): Promise<NotificationRun[]>;

  /** Найти все PENDING записи */
  findPending(): Promise<NotificationRun[]>;
}
