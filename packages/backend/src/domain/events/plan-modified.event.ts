/**
 * PlanModifiedEvent Domain Event
 *
 * Событие, возникающее при модификации зафиксированного плана спринта директором.
 * Содержит информацию о внесённых изменениях для обработки
 * в других модулях (уведомления, аудит, аналитика).
 */
import { BaseEvent } from './base.event';

export interface PlanModifiedEventPayload {
  periodId: string;
  taskId: string;
  issueNumber: string;
  newVersionNumber: number;
  modifiedByUserId: string;
  plannedDevMinutes: number | null;
  plannedTestMinutes: number | null;
  plannedMgmtMinutes: number | null;
  plannedDebugMinutes: number | null;
  comment: string;
}

export class PlanModifiedEvent extends BaseEvent {
  public readonly periodId: string;
  public readonly taskId: string;
  public readonly issueNumber: string;
  public readonly newVersionNumber: number;
  public readonly modifiedByUserId: string;
  public readonly plannedDevMinutes: number | null;
  public readonly plannedTestMinutes: number | null;
  public readonly plannedMgmtMinutes: number | null;
  public readonly plannedDebugMinutes: number | null;
  public readonly comment: string;

  constructor(payload: PlanModifiedEventPayload) {
    super();
    this.periodId = payload.periodId;
    this.taskId = payload.taskId;
    this.issueNumber = payload.issueNumber;
    this.newVersionNumber = payload.newVersionNumber;
    this.modifiedByUserId = payload.modifiedByUserId;
    this.plannedDevMinutes = payload.plannedDevMinutes;
    this.plannedTestMinutes = payload.plannedTestMinutes;
    this.plannedMgmtMinutes = payload.plannedMgmtMinutes;
    this.plannedDebugMinutes = payload.plannedDebugMinutes;
    this.comment = payload.comment;
  }

  /** Сериализация события для логирования/аудита */
  toJSON(): Record<string, unknown> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn.toISOString(),
      periodId: this.periodId,
      taskId: this.taskId,
      issueNumber: this.issueNumber,
      newVersionNumber: this.newVersionNumber,
      modifiedByUserId: this.modifiedByUserId,
      plannedDevMinutes: this.plannedDevMinutes,
      plannedTestMinutes: this.plannedTestMinutes,
      plannedMgmtMinutes: this.plannedMgmtMinutes,
      plannedDebugMinutes: this.plannedDebugMinutes,
      comment: this.comment,
    };
  }
}
