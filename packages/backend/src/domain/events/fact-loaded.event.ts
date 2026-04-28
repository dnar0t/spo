/**
 * FactLoadedEvent Domain Event
 *
 * Событие, возникающее после загрузки фактических трудозатрат (work items)
 * из YouTrack для отчётного периода.
 * Содержит метрики загруженных данных для обработки в других модулях.
 */
import { BaseEvent } from './base.event';

export interface FactLoadedEventPayload {
  periodId: string;
  source: 'MANUAL' | 'SCHEDULED';
  workItemCount: number;
  loadedAt: Date;
}

export class FactLoadedEvent extends BaseEvent {
  public readonly periodId: string;
  public readonly source: 'MANUAL' | 'SCHEDULED';
  public readonly workItemCount: number;
  public readonly loadedAt: Date;

  constructor(payload: FactLoadedEventPayload) {
    super();
    this.periodId = payload.periodId;
    this.source = payload.source;
    this.workItemCount = payload.workItemCount;
    this.loadedAt = payload.loadedAt;
  }

  /** Сериализация события для логирования/аудита */
  toJSON(): Record<string, unknown> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      periodId: this.periodId,
      source: this.source,
      workItemCount: this.workItemCount,
      loadedAt: this.loadedAt.toISOString(),
    };
  }
}
