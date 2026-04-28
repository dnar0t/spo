/**
 * PersonalReport Entity (Domain Layer)
 *
 * Сущность личного отчёта сотрудника за период (materialized).
 * Содержит строку отчёта по одной задаче с полными финансовыми расчётами.
 */
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';
import { InvalidArgumentError } from '../errors/domain.error';

export interface PersonalReportCreateParams {
  id?: string;
  periodId: string;
  userId: string;
  youtrackIssueId: string;
  issueNumber: string;
  summary: string;
  stateName?: string | null;
  parentIssueNumber?: string | null;
  parentIssueId?: string | null;
  estimationMinutes?: Minutes | null;
  actualMinutes?: Minutes | null;
  isPlanned?: boolean;
  readinessPercent?: Percentage | null;
  plannedDevMinutes?: Minutes | null;
  plannedTestMinutes?: Minutes | null;
  plannedMgmtMinutes?: Minutes | null;
  actualDevMinutes?: Minutes | null;
  actualTestMinutes?: Minutes | null;
  actualMgmtMinutes?: Minutes | null;
  remainingMinutes?: Minutes | null;
  baseAmount?: Money | null;
  managerEvaluationType?: string | null;
  managerPercent?: Percentage | null;
  managerAmount?: Money | null;
  businessEvaluationType?: string | null;
  businessPercent?: Percentage | null;
  businessAmount?: Money | null;
  totalOnHand?: Money | null;
  ndfl?: Money | null;
  insurance?: Money | null;
  reserveVacation?: Money | null;
  totalWithTax?: Money | null;
  effectiveRate?: number | null;
  sortOrder?: number;
}

export interface PersonalReportPersistenceData {
  id: string;
  periodId: string;
  userId: string;
  youtrackIssueId: string;
  issueNumber: string;
  summary: string;
  stateName: string | null;
  parentIssueNumber: string | null;
  parentIssueId: string | null;
  estimationMinutes: number | null;
  actualMinutes: number | null;
  isPlanned: boolean;
  readinessPercent: number | null;
  plannedDevMinutes: number | null;
  plannedTestMinutes: number | null;
  plannedMgmtMinutes: number | null;
  actualDevMinutes: number | null;
  actualTestMinutes: number | null;
  actualMgmtMinutes: number | null;
  remainingMinutes: number | null;
  baseAmount: number | null;
  managerEvaluationType: string | null;
  managerPercent: number | null;
  managerAmount: number | null;
  businessEvaluationType: string | null;
  businessPercent: number | null;
  businessAmount: number | null;
  totalOnHand: number | null;
  ndfl: number | null;
  insurance: number | null;
  reserveVacation: number | null;
  totalWithTax: number | null;
  effectiveRate: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryCalculationParams {
  baseAmount: Money;
  managerPercent: Percentage;
  businessPercent: Percentage;
  ndflPercent: Percentage;
  insurancePercent: Percentage;
  vacationReservePercent: Percentage;
}

export interface SalaryCalculationResult {
  managerAmount: Money;
  businessAmount: Money;
  totalOnHand: Money;
  ndfl: Money;
  insurance: Money;
  reserveVacation: Money;
  totalWithTax: Money;
}

export class PersonalReport {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private readonly _userId: string,
    private _youtrackIssueId: string,
    private _issueNumber: string,
    private _summary: string,
    private _stateName: string | null,
    private _parentIssueNumber: string | null,
    private _parentIssueId: string | null,
    private _estimationMinutes: Minutes | null,
    private _actualMinutes: Minutes | null,
    private _isPlanned: boolean,
    private _readinessPercent: Percentage | null,
    private _plannedDevMinutes: Minutes | null,
    private _plannedTestMinutes: Minutes | null,
    private _plannedMgmtMinutes: Minutes | null,
    private _actualDevMinutes: Minutes | null,
    private _actualTestMinutes: Minutes | null,
    private _actualMgmtMinutes: Minutes | null,
    private _remainingMinutes: Minutes | null,
    private _baseAmount: Money | null,
    private _managerEvaluationType: string | null,
    private _managerPercent: Percentage | null,
    private _managerAmount: Money | null,
    private _businessEvaluationType: string | null,
    private _businessPercent: Percentage | null,
    private _businessAmount: Money | null,
    private _totalOnHand: Money | null,
    private _ndfl: Money | null,
    private _insurance: Money | null,
    private _reserveVacation: Money | null,
    private _totalWithTax: Money | null,
    private _effectiveRate: number | null,
    private _sortOrder: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get periodId(): string { return this._periodId; }
  get userId(): string { return this._userId; }
  get youtrackIssueId(): string { return this._youtrackIssueId; }
  get issueNumber(): string { return this._issueNumber; }
  get summary(): string { return this._summary; }
  get stateName(): string | null { return this._stateName; }
  get parentIssueNumber(): string | null { return this._parentIssueNumber; }
  get parentIssueId(): string | null { return this._parentIssueId; }
  get estimationMinutes(): Minutes | null { return this._estimationMinutes; }
  get actualMinutes(): Minutes | null { return this._actualMinutes; }
  get isPlanned(): boolean { return this._isPlanned; }
  get readinessPercent(): Percentage | null { return this._readinessPercent; }
  get plannedDevMinutes(): Minutes | null { return this._plannedDevMinutes; }
  get plannedTestMinutes(): Minutes | null { return this._plannedTestMinutes; }
  get plannedMgmtMinutes(): Minutes | null { return this._plannedMgmtMinutes; }
  get actualDevMinutes(): Minutes | null { return this._actualDevMinutes; }
  get actualTestMinutes(): Minutes | null { return this._actualTestMinutes; }
  get actualMgmtMinutes(): Minutes | null { return this._actualMgmtMinutes; }
  get remainingMinutes(): Minutes | null { return this._remainingMinutes; }
  get baseAmount(): Money | null { return this._baseAmount; }
  get managerEvaluationType(): string | null { return this._managerEvaluationType; }
  get managerPercent(): Percentage | null { return this._managerPercent; }
  get managerAmount(): Money | null { return this._managerAmount; }
  get businessEvaluationType(): string | null { return this._businessEvaluationType; }
  get businessPercent(): Percentage | null { return this._businessPercent; }
  get businessAmount(): Money | null { return this._businessAmount; }
  get totalOnHand(): Money | null { return this._totalOnHand; }
  get ndfl(): Money | null { return this._ndfl; }
  get insurance(): Money | null { return this._insurance; }
  get reserveVacation(): Money | null { return this._reserveVacation; }
  get totalWithTax(): Money | null { return this._totalWithTax; }
  get effectiveRate(): number | null { return this._effectiveRate; }
  get sortOrder(): number { return this._sortOrder; }
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

  // ─── Бизнес-методы ───

  /** Обновить фактические часы */
  updateActual(devMinutes: Minutes | null, testMinutes: Minutes | null, mgmtMinutes: Minutes | null): void {
    this._actualDevMinutes = devMinutes;
    this._actualTestMinutes = testMinutes;
    this._actualMgmtMinutes = mgmtMinutes;
    this._actualMinutes = this.totalActualMinutes;
    this.calculateRemaining();
    this._updatedAt = new Date();
  }

  /** Обновить оценки (руководитель и/или бизнес) */
  updateEvaluation(manager?: { type?: string | null; percent?: Percentage | null }, business?: { type?: string | null; percent?: Percentage | null }): void {
    if (manager) {
      if (manager.type !== undefined) this._managerEvaluationType = manager.type;
      if (manager.percent !== undefined) this._managerPercent = manager.percent;
    }
    if (business) {
      if (business.type !== undefined) this._businessEvaluationType = business.type;
      if (business.percent !== undefined) this._businessPercent = business.percent;
    }
    this._updatedAt = new Date();
  }

  /** Рассчитать остаток (remaining = planned - actual) */
  calculateRemaining(): void {
    const planned = this.totalPlannedMinutes.minutes;
    const actual = this.totalActualMinutes.minutes;
    this._remainingMinutes = Minutes.fromMinutes(Math.max(0, planned - actual));
  }

  /** Рассчитать финансовые показатели для строки отчёта */
  calcFinancials(params: SalaryCalculationParams): void {
    this._baseAmount = params.baseAmount;
    this._managerAmount = params.managerAmount;
    this._businessAmount = params.businessAmount;
    this._totalOnHand = params.totalOnHand;
    this._ndfl = params.ndfl;
    this._insurance = params.insurance;
    this._reserveVacation = params.reserveVacation;
    this._totalWithTax = params.totalWithTax;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: PersonalReportCreateParams): PersonalReport {
    const now = new Date();
    return new PersonalReport(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.userId,
      params.youtrackIssueId,
      params.issueNumber,
      params.summary,
      params.stateName ?? null,
      params.parentIssueNumber ?? null,
      params.parentIssueId ?? null,
      params.estimationMinutes ?? null,
      params.actualMinutes ?? null,
      params.isPlanned ?? false,
      params.readinessPercent ?? null,
      params.plannedDevMinutes ?? null,
      params.plannedTestMinutes ?? null,
      params.plannedMgmtMinutes ?? null,
      params.actualDevMinutes ?? null,
      params.actualTestMinutes ?? null,
      params.actualMgmtMinutes ?? null,
      params.remainingMinutes ?? null,
      params.baseAmount ?? null,
      params.managerEvaluationType ?? null,
      params.managerPercent ?? null,
      params.managerAmount ?? null,
      params.businessEvaluationType ?? null,
      params.businessPercent ?? null,
      params.businessAmount ?? null,
      params.totalOnHand ?? null,
      params.ndfl ?? null,
      params.insurance ?? null,
      params.reserveVacation ?? null,
      params.totalWithTax ?? null,
      params.effectiveRate ?? null,
      params.sortOrder ?? 0,
      now,
      now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: PersonalReportPersistenceData): PersonalReport {
    return new PersonalReport(
      data.id,
      data.periodId,
      data.userId,
      data.youtrackIssueId,
      data.issueNumber,
      data.summary,
      data.stateName,
      data.parentIssueNumber,
      data.parentIssueId,
      data.estimationMinutes !== null ? Minutes.fromMinutes(data.estimationMinutes) : null,
      data.actualMinutes !== null ? Minutes.fromMinutes(data.actualMinutes) : null,
      data.isPlanned,
      data.readinessPercent !== null ? Percentage.fromBasisPoints(data.readinessPercent) : null,
      data.plannedDevMinutes !== null ? Minutes.fromMinutes(data.plannedDevMinutes) : null,
      data.plannedTestMinutes !== null ? Minutes.fromMinutes(data.plannedTestMinutes) : null,
      data.plannedMgmtMinutes !== null ? Minutes.fromMinutes(data.plannedMgmtMinutes) : null,
      data.actualDevMinutes !== null ? Minutes.fromMinutes(data.actualDevMinutes) : null,
      data.actualTestMinutes !== null ? Minutes.fromMinutes(data.actualTestMinutes) : null,
      data.actualMgmtMinutes !== null ? Minutes.fromMinutes(data.actualMgmtMinutes) : null,
      data.remainingMinutes !== null ? Minutes.fromMinutes(data.remainingMinutes) : null,
      data.baseAmount !== null ? Money.fromKopecks(data.baseAmount) : null,
      data.managerEvaluationType,
      data.managerPercent !== null ? Percentage.fromBasisPoints(data.managerPercent) : null,
      data.managerAmount !== null ? Money.fromKopecks(data.managerAmount) : null,
      data.businessEvaluationType,
      data.businessPercent !== null ? Percentage.fromBasisPoints(data.businessPercent) : null,
      data.businessAmount !== null ? Money.fromKopecks(data.businessAmount) : null,
      data.totalOnHand !== null ? Money.fromKopecks(data.totalOnHand) : null,
      data.ndfl !== null ? Money.fromKopecks(data.ndfl) : null,
      data.insurance !== null ? Money.fromKopecks(data.insurance) : null,
      data.reserveVacation !== null ? Money.fromKopecks(data.reserveVacation) : null,
      data.totalWithTax !== null ? Money.fromKopecks(data.totalWithTax) : null,
      data.effectiveRate,
      data.sortOrder,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      user_id: this._userId,
      youtrack_issue_id: this._youtrackIssueId,
      issue_number: this._issueNumber,
      summary: this._summary,
      state_name: this._stateName,
      parent_issue_number: this._parentIssueNumber,
      parent_issue_id: this._parentIssueId,
      estimation_minutes: this._estimationMinutes?.minutes ?? null,
      actual_minutes: this._actualMinutes?.minutes ?? null,
      is_planned: this._isPlanned,
      readiness_percent: this._readinessPercent?.basisPoints ?? null,
      planned_dev_minutes: this._plannedDevMinutes?.minutes ?? null,
      planned_test_minutes: this._plannedTestMinutes?.minutes ?? null,
      planned_mgmt_minutes: this._plannedMgmtMinutes?.minutes ?? null,
      actual_dev_minutes: this._actualDevMinutes?.minutes ?? null,
      actual_test_minutes: this._actualTestMinutes?.minutes ?? null,
      actual_mgmt_minutes: this._actualMgmtMinutes?.minutes ?? null,
      remaining_minutes: this._remainingMinutes?.minutes ?? null,
      base_amount: this._baseAmount?.kopecks ?? null,
      manager_evaluation_type: this._managerEvaluationType,
      manager_percent: this._managerPercent?.basisPoints ?? null,
      manager_amount: this._managerAmount?.kopecks ?? null,
      business_evaluation_type: this._businessEvaluationType,
      business_percent: this._businessPercent?.basisPoints ?? null,
      business_amount: this._businessAmount?.kopecks ?? null,
      total_on_hand: this._totalOnHand?.kopecks ?? null,
      ndfl: this._ndfl?.kopecks ?? null,
      insurance: this._insurance?.kopecks ?? null,
      reserve_vacation: this._reserveVacation?.kopecks ?? null,
      total_with_tax: this._totalWithTax?.kopecks ?? null,
      effective_rate: this._effectiveRate,
      sort_order: this._sortOrder,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
