/**
 * GetNotificationHistoryUseCase
 *
 * Получение истории отправки уведомлений.
 * Поддерживает фильтрацию по периоду, получателю и событию.
 */
import { NotificationRunRepository } from '../../../domain/repositories/notification-run.repository';
import { NotificationRun } from '../../../domain/entities/notification-run.entity';

export interface GetNotificationHistoryQuery {
  recipientId?: string;
  eventName?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetNotificationHistoryResult {
  items: NotificationRun[];
  total: number;
}

export class GetNotificationHistoryUseCase {
  constructor(
    private readonly notificationRunRepository: NotificationRunRepository,
  ) {}

  async execute(query: GetNotificationHistoryQuery): Promise<GetNotificationHistoryResult> {
    const { recipientId, eventName, status } = query;

    // Если указан конкретный получатель
    if (recipientId) {
      const items = await this.notificationRunRepository.findByRecipientId(recipientId);
      return {
        items,
        total: items.length,
      };
    }

    // Если указано имя события
    if (eventName) {
      const items = await this.notificationRunRepository.findByEventName(eventName);
      return {
        items,
        total: items.length,
      };
    }

    // Если указан статус
    if (status) {
      const items = await this.notificationRunRepository.findByStatus(status);
      return {
        items,
        total: items.length,
      };
    }

    // Иначе возвращаем всё
    const items = await this.notificationRunRepository.findAll();

    // Простая фильтрация по датам на клиенте (в production — через БД)
    let filtered = items;
    if (query.fromDate) {
      filtered = filtered.filter((run) => run.createdAt >= query.fromDate!);
    }
    if (query.toDate) {
      filtered = filtered.filter((run) => run.createdAt <= query.toDate!);
    }

    // Сортировка по дате создания (сначала новые)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Пагинация
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total: filtered.length,
    };
  }
}
