/**
 * EventBusService
 *
 * Простая реализация EventBus (in-process pub/sub) для межмодульного
 * взаимодействия. Зарегистрирован глобально в AppModule, поэтому доступен
 * для инъекции во все модули без явного импорта содержащего модуля.
 *
 * Позволяет модулям подписываться на события и реагировать на них,
 * избегая циклических зависимостей между модулями.
 *
 * Event → Subscriber(handler) → выполнение action
 *
 * Пример использования:
 *   // Публикация
 *   eventBusService.publish(new PlanFixedEvent({ ... }));
 *
 *   // Подписка
 *   eventBusService.subscribe(PlanFixedEvent.name, (event) => { ... });
 */
import { Injectable, Logger } from '@nestjs/common';
import { BaseEvent } from '../domain/events/base.event';

export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void> | void;

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  /**
   * Подписаться на событие.
   *
   * @param eventName - имя события (eventName из BaseEvent)
   * @param handler - обработчик события
   * @returns функция отписки
   */
  subscribe<T extends BaseEvent>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }

    const handlers = this.subscribers.get(eventName)!;
    handlers.add(handler as EventHandler);

    this.logger.debug(`Subscribed to event "${eventName}". Total subscribers: ${handlers.size}`);

    // Возвращаем функцию отписки
    return () => {
      handlers.delete(handler as EventHandler);
      this.logger.debug(`Unsubscribed from event "${eventName}".`);
    };
  }

  /**
   * Опубликовать событие.
   * Вызывает всех подписчиков асинхронно (fire-and-forget с логированием ошибок).
   *
   * @param event - экземпляр события
   */
  async publish<T extends BaseEvent>(event: T): Promise<void> {
    const eventName = event.eventName;
    const handlers = this.subscribers.get(eventName);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`Event "${eventName}" published, but no subscribers.`);
      return;
    }

    this.logger.debug(`Publishing event "${eventName}" to ${handlers.size} subscriber(s).`);

    const promises: Promise<void>[] = [];

    for (const handler of handlers) {
      try {
        const result = handler(event);
        // Если handler вернул Promise — ждём его выполнения
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        this.logger.error(
          `Handler for event "${eventName}" threw synchronously: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Ждём завершения всех асинхронных обработчиков
    if (promises.length > 0) {
      const results = await Promise.allSettled(promises);

      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Handler for event "${eventName}" failed: ${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            }`,
          );
        }
      }
    }
  }

  /**
   * Отписать все обработчики от события.
   *
   * @param eventName - имя события
   */
  clearSubscribers(eventName: string): void {
    this.subscribers.delete(eventName);
    this.logger.debug(`All subscribers cleared for event "${eventName}".`);
  }

  /**
   * Отписать все обработчики от всех событий.
   */
  clearAllSubscribers(): void {
    this.subscribers.clear();
    this.logger.debug('All subscribers cleared.');
  }
}
