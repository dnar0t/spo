/**
 * PlanFixedEvent Domain Event
 *
 * Событие, возникающее при фиксации плана спринта.
 * Содержит ключевые метрики зафиксированного плана для обработки
 * в других модулях (уведомления, аудит, аналитика).
 */
import { BaseEvent } from './base.event';

export interface PlanFixedEventPayload {
  periodId: string;
  versionNumber: number;
  fixedByUserId: string;
  totalPlannedMinutes: number;
  taskCount: number;
}

export class PlanFixedEvent extends BaseEvent {
  public readonly periodId: string;
  public readonly versionNumber: number;
  public readonly fixedByUserId: string;
  public readonly totalPlannedMinutes: number;
  public readonly taskCount: number;

  constructor(payload: PlanFixedEventPayload) {
    super();
    this.periodId = payload.periodId;
    this.versionNumber = payload.versionNumber;
    this.fixedByUserId = payload.fixedByUserId;
    this.totalPlannedMinutes = payload.totalPlannedMinutes;
    this.taskCount = payload.taskCount;
  }

  /** Сериализация события для логирования/аудита */
  toJSON(): Record<string, unknown> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      periodId: this.periodId,
      versionNumber: this.versionNumber,
      fixedByUserId: this.fixedByUserId,
      totalPlannedMinutes: this.totalPlannedMinutes,
      taskCount: this.taskCount,
    };
  }
}
