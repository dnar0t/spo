/**
 * SummaryReport Entity (Domain Layer)
 *
 * Строка итогового отчёта периода (materialized).
 * Содержит агрегированные данные по задаче для сводного отчёта.
 */
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';

export interface SummaryReportCreateParams {
  id?: string;
  periodId: string;
  systemName?: string | null;
  projectName?: string | null;
  groupLevel?: string | null;
  groupKey?: string | null;
  issueNumber: string;
  summary: string;
  typeName?: string | null;
  priorityName?: string | null;
  stateName?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  isPlanned?: boolean;
  readinessPercent?: Percentage | null;
  plannedDevMinutes?: Minutes | null;
  plannedTestMinutes?: Minutes | null;
  plannedMgmtMinutes?: Minutes | null;
  actualDevMinutes?: Minutes | null;
  actualTestMinutes?: Minutes | null;
  actualMgmtMinutes?: Minutes | null;
  remainingMinutes?: Minutes | null;
  plannedCost?: Money | null;
  actualCost?: Money | null;
  remainingCost?: Money | null;
  businessEvaluationType?: string | null;
  managerEvaluationType?: string | null;
  managerComment?: string | null;
}

export interface SummaryReportPersistenceData {
  id: string;
  periodId: string;
  systemName: string | null;
  projectName: string | null;
  groupLevel: string | null;
  groupKey: string | null;
  issueNumber: string;
  summary: string;
  typeName: string | null;
  priorityName: string | null;
  stateName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  isPlanned: boolean;
  readinessPercent: number | null;
  plannedDevMinutes: number | null;
  plannedTestMinutes: number | null;
  plannedMgmtMinutes: number | null;
  actualDevMinutes: number | null;
  actualTestMinutes: number | null;
  actualMgmtMinutes: number | null;
  remainingMinutes: number | null;
  plannedCost: number | null;
  actualCost: number | null;
  remainingCost: number | null;
  businessEvaluationType: string | null;
  managerEvaluationType: string | null;
  managerComment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SummaryReport {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private _systemName: string | null,
    private _projectName: string | null,
    private _groupLevel: string | null,
    private _groupKey: string | null,
    private _issueNumber: string,
    private _summary: string,
    private _typeName: string | null,
    private _priorityName: string | null,
    private _stateName: string | null,
    private _assigneeId: string | null,
    private _assigneeName: string | null,
    private _isPlanned: boolean,
    private _readinessPercent: Percentage | null,
    private _plannedDevMinutes: Minutes | null,
    private _plannedTestMinutes: Minutes | null,
    private _plannedMgmtMinutes: Minutes | null,
    private _actualDevMinutes: Minutes | null,
    private _actualTestMinutes: Minutes | null,
    private _actualMgmtMinutes: Minutes | null,
    private _remainingMinutes: Minutes | null,
    private _plannedCost: Money | null,
    private _actualCost: Money | null,
    private _remainingCost: Money | null,
    private _businessEvaluationType: string | null,
    private _managerEvaluationType: string | null,
    private _managerComment: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get periodId(): string { return this._periodId; }
  get systemName(): string | null { return this._systemName; }
  get projectName(): string | null { return this._projectName; }
  get groupLevel(): string | null { return this._groupLevel; }
  get groupKey(): string | null { return this._groupKey; }
  get issueNumber(): string { return this._issueNumber; }
  get summary(): string { return this._summary; }
  get typeName(): string | null { return this._typeName; }
  get priorityName(): string | null { return this._priorityName; }
  get stateName(): string | null { return this._stateName; }
  get assigneeId(): string | null { return this._assigneeId; }
  get assigneeName(): string | null { return this._assigneeName; }
  get isPlanned(): boolean { return this._isPlanned; }
  get readinessPercent(): Percentage | null { return this._readinessPercent; }
  get plannedDevMinutes(): Minutes | null { return this._plannedDevMinutes; }
  get plannedTestMinutes(): Minutes | null { return this._plannedTestMinutes; }
  get plannedMgmtMinutes(): Minutes | null { return this._plannedMgmtMinutes; }
  get actualDevMinutes(): Minutes | null { return this._actualDevMinutes; }
  get actualTestMinutes(): Minutes | null { return this._actualTestMinutes; }
  get actualMgmtMinutes(): Minutes | null { return this._actualMgmtMinutes; }
  get remainingMinutes(): Minutes | null { return this._remainingMinutes; }
  get plannedCost(): Money | null { return this._plannedCost; }
  get actualCost(): Money | null { return this._actualCost; }
  get remainingCost(): Money | null { return this._remainingCost; }
  get businessEvaluationType(): string | null { return this._businessEvaluationType; }
  get managerEvaluationType(): string | null { return this._managerEvaluationType; }
  get managerComment(): string | null { return this._managerComment; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /** Общее запланированное время (dev + test + mgmt) */
  get totalPlannedMinutes(): Minutes {
    const dev = this._plannedDevMinutes?.minutes ?? 0;
    const test = this._plannedTestMinutes?.minutes ?? 0;
    const mgmt = this._plannedMgmtMinutes?.minutes ?? 0;
    return Minutes.fromMinutes(dev + test + mgmt);
  }

  /** Общее фактическое время (dev + test + mgmt) */
  get totalActualMinutes(): Minutes {
    const dev = this._actualDevMinutes?.minutes ?? 0;
    const test = this._actualTestMinutes?.minutes ?? 0;
    const mgmt = this._actualMgmtMinutes?.minutes ?? 0;
    return Minutes.fromMinutes(dev + test + mgmt);
  }

  // ─── Фабричный метод ───

  static create(params: SummaryReportCreateParams): SummaryReport {
    const now = new Date();
    return new SummaryReport(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.systemName ?? null,
      params.projectName ?? null,
      params.groupLevel ?? null,
      params.groupKey ?? null,
      params.issueNumber,
      params.summary,
      params.typeName ?? null,
      params.priorityName ?? null,
      params.stateName ?? null,
      params.assigneeId ?? null,
      params.assigneeName ?? null,
      params.isPlanned ?? false,
      params.readinessPercent ?? null,
      params.plannedDevMinutes ?? null,
      params.plannedTestMinutes ?? null,
      params.plannedMgmtMinutes ?? null,
      params.actualDevMinutes ?? null,
      params.actualTestMinutes ?? null,
      params.actualMgmtMinutes ?? null,
      params.remainingMinutes ?? null,
      params.plannedCost ?? null,
      params.actualCost ?? null,
      params.remainingCost ?? null,
      params.businessEvaluationType ?? null,
      params.managerEvaluationType ?? null,
      params.managerComment ?? null,
      now,
      now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: SummaryReportPersistenceData): SummaryReport {
    return new SummaryReport(
      data.id,
      data.periodId,
      data.systemName,
      data.projectName,
      data.groupLevel,
      data.groupKey,
      data.issueNumber,
      data.summary,
      data.typeName,
      data.priorityName,
      data.stateName,
      data.assigneeId,
      data.assigneeName,
      data.isPlanned,
      data.readinessPercent !== null ? Percentage.fromBasisPoints(data.readinessPercent) : null,
      data.plannedDevMinutes !== null ? Minutes.fromMinutes(data.plannedDevMinutes) : null,
      data.plannedTestMinutes !== null ? Minutes.fromMinutes(data.plannedTestMinutes) : null,
      data.plannedMgmtMinutes !== null ? Minutes.fromMinutes(data.plannedMgmtMinutes) : null,
      data.actualDevMinutes !== null ? Minutes.fromMinutes(data.actualDevMinutes) : null,
      data.actualTestMinutes !== null ? Minutes.fromMinutes(data.actualTestMinutes) : null,
      data.actualMgmtMinutes !== null ? Minutes.fromMinutes(data.actualMgmtMinutes) : null,
      data.remainingMinutes !== null ? Minutes.fromMinutes(data.remainingMinutes) : null,
      data.plannedCost !== null ? Money.fromKopecks(data.plannedCost) : null,
      data.actualCost !== null ? Money.fromKopecks(data.actualCost) : null,
      data.remainingCost !== null ? Money.fromKopecks(data.remainingCost) : null,
      data.businessEvaluationType,
      data.managerEvaluationType,
      data.managerComment,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      system_name: this._systemName,
      project_name: this._projectName,
      group_level: this._groupLevel,
      group_key: this._groupKey,
      issue_number: this._issueNumber,
      summary: this._summary,
      type_name: this._typeName,
      priority_name: this._priorityName,
      state_name: this._stateName,
      assignee_id: this._assigneeId,
      assignee_name: this._assigneeName,
      is_planned: this._isPlanned,
      readiness_percent: this._readinessPercent?.basisPoints ?? null,
      planned_dev_minutes: this._plannedDevMinutes?.minutes ?? null,
      planned_test_minutes: this._plannedTestMinutes?.minutes ?? null,
      planned_mgmt_minutes: this._plannedMgmtMinutes?.minutes ?? null,
      actual_dev_minutes: this._actualDevMinutes?.minutes ?? null,
      actual_test_minutes: this._actualTestMinutes?.minutes ?? null,
      actual_mgmt_minutes: this._actualMgmtMinutes?.minutes ?? null,
      remaining_minutes: this._remainingMinutes?.minutes ?? null,
      planned_cost: this._plannedCost?.kopecks ?? null,
      actual_cost: this._actualCost?.kopecks ?? null,
      remaining_cost: this._remainingCost?.kopecks ?? null,
      business_evaluation_type: this._businessEvaluationType,
      manager_evaluation_type: this._managerEvaluationType,
      manager_comment: this._managerComment,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
