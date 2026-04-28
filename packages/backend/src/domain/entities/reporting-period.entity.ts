/**
 * ReportingPeriod Entity (Domain Layer)
 *
 * Корневая сущность отчётного периода в модуле Sprint Planning.
 * Содержит бизнес-правила управления жизненным циклом периода,
 * включая стейт-машину переходов, настройки норм времени и фильтры.
 */
import { PeriodState } from '../value-objects/period-state.vo';
import { Percentage } from '../value-objects/percentage.vo';
import { DomainStateError, InvalidArgumentError } from '../errors/domain.error';

export interface ReportingPeriodCreateParams {
  id?: string;
  month: number;
  year: number;
  workHoursPerMonth?: number | null;
  reservePercent?: Percentage | null;
  testPercent?: Percentage | null;
  debugPercent?: Percentage | null;
  mgmtPercent?: Percentage | null;
  yellowThreshold?: Percentage | null;
  redThreshold?: Percentage | null;
  businessGroupingLevel?: 'EPIC' | 'FEATURE' | 'STORY' | 'TASK' | null;
  employeeFilter?: string[] | null;
  projectFilter?: string[] | null;
  priorityFilter?: string[] | null;
  createdById: string;
}

export interface ReportingPeriodPersistenceData {
  id: string;
  month: number;
  year: number;
  state: string;
  workHoursPerMonth: number | null;
  reservePercent: number | null;
  testPercent: number | null;
  debugPercent: number | null;
  mgmtPercent: number | null;
  yellowThreshold: number | null;
  redThreshold: number | null;
  businessGroupingLevel: string | null;
  employeeFilter: string[] | null;
  projectFilter: string[] | null;
  priorityFilter: string[] | null;
  createdById: string;
  closedAt: Date | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReportingPeriod {
  private constructor(
    private readonly _id: string,
    private readonly _month: number,
    private readonly _year: number,
    private _state: PeriodState,
    private _workHoursPerMonth: number | null,
    private _reservePercent: Percentage | null,
    private _testPercent: Percentage | null,
    private _debugPercent: Percentage | null,
    private _mgmtPercent: Percentage | null,
    private _yellowThreshold: Percentage | null,
    private _redThreshold: Percentage | null,
    private _businessGroupingLevel: string | null,
    private _employeeFilter: string[] | null,
    private _projectFilter: string[] | null,
    private _priorityFilter: string[] | null,
    private readonly _createdById: string,
    private _closedAt: Date | null,
    private _reopenedAt: Date | null,
    private _reopenReason: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.validateMonth();
    this.validateYear();
    this.validateThresholds();
    this.validateGroupingLevel();
    this.validatePercentSum();
  }

  // ─── Валидация ───

  private validateMonth(): void {
    if (!Number.isInteger(this._month) || this._month < 1 || this._month > 12) {
      throw new InvalidArgumentError('month', `Month must be between 1 and 12. Got: ${this._month}`);
    }
  }

  private validateYear(): void {
    if (!Number.isInteger(this._year) || this._year < 2000 || this._year > 2100) {
      throw new InvalidArgumentError('year', `Year must be between 2000 and 2100. Got: ${this._year}`);
    }
  }

  private validateThresholds(): void {
    if (this._yellowThreshold && this._redThreshold) {
      if (this._yellowThreshold.greaterThanOrEqual(this._redThreshold)) {
        throw new InvalidArgumentError(
          'thresholds',
          'Yellow threshold must be less than red threshold',
        );
      }
    }
  }

  private validateGroupingLevel(): void {
    const allowedLevels = ['EPIC', 'FEATURE', 'STORY', 'TASK'];
    if (this._businessGroupingLevel !== null && !allowedLevels.includes(this._businessGroupingLevel)) {
      throw new InvalidArgumentError(
        'businessGroupingLevel',
        `Must be one of ${allowedLevels.join(', ')}. Got: ${this._businessGroupingLevel}`,
      );
    }
  }

  private validatePercentSum(): void {
    const reserve = this._reservePercent?.basisPoints ?? 0;
    const test = this._testPercent?.basisPoints ?? 0;
    const debug = this._debugPercent?.basisPoints ?? 0;
    const mgmt = this._mgmtPercent?.basisPoints ?? 0;
    const total = reserve + test + debug + mgmt;
    if (total > 10000) {
      throw new InvalidArgumentError(
        'percentages',
        `Sum of percentages (${total / 100}%) must not exceed 100%`,
      );
    }
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get month(): number {
    return this._month;
  }

  get year(): number {
    return this._year;
  }

  get state(): PeriodState {
    return this._state;
  }

  get workHoursPerMonth(): number | null {
    return this._workHoursPerMonth;
  }

  get reservePercent(): Percentage | null {
    return this._reservePercent;
  }

  get testPercent(): Percentage | null {
    return this._testPercent;
  }

  get debugPercent(): Percentage | null {
    return this._debugPercent;
  }

  get mgmtPercent(): Percentage | null {
    return this._mgmtPercent;
  }

  get yellowThreshold(): Percentage | null {
    return this._yellowThreshold;
  }

  get redThreshold(): Percentage | null {
    return this._redThreshold;
  }

  get businessGroupingLevel(): string | null {
    return this._businessGroupingLevel;
  }

  get employeeFilter(): string[] | null {
    return this._employeeFilter;
  }

  get projectFilter(): string[] | null {
    return this._projectFilter;
  }

  get priorityFilter(): string[] | null {
    return this._priorityFilter;
  }

  get createdById(): string {
    return this._createdById;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }

  get reopenedAt(): Date | null {
    return this._reopenedAt;
  }

  get reopenReason(): string | null {
    return this._reopenReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /** Перевести период в новое состояние */
  transitionTo(newState: PeriodState, userId?: string, reason?: string): void {
    if (!this._state.canTransitionTo(newState)) {
      throw new DomainStateError(
        `Cannot transition from ${this._state.value} to ${newState.value}`,
        {
          fromState: this._state.value,
          toState: newState.value,
          periodId: this._id,
        },
      );
    }

    this._state = newState;
    this._updatedAt = new Date();

    // Обновляем метки времени в зависимости от состояния
    if (newState.value === 'PERIOD_CLOSED') {
      this._closedAt = new Date();
      this._reopenedAt = null;
      this._reopenReason = null;
    } else if (newState.value === 'PERIOD_REOPENED') {
      this._reopenedAt = new Date();
      this._reopenReason = reason ?? null;
      this._closedAt = null;
    }
  }

  /** Закрыт ли период */
  isClosed(): boolean {
    return this._state.value === 'PERIOD_CLOSED';
  }

  /** Находится ли в состоянии планирования */
  isPlanning(): boolean {
    return this._state.value === 'PLANNING';
  }

  /** Зафиксирован ли план */
  isPlanFixed(): boolean {
    return this._state.value === 'PLAN_FIXED';
  }

  /** Можно ли редактировать план */
  canEditPlan(): boolean {
    return this._state.isEditable();
  }

  /** Обновить настройки процентов */
  updatePercentages(params: {
    reservePercent?: Percentage | null;
    testPercent?: Percentage | null;
    debugPercent?: Percentage | null;
    mgmtPercent?: Percentage | null;
  }): void {
    if (!this.canEditPlan()) {
      throw new DomainStateError(
        'Cannot update percentages when plan is not editable',
        { currentState: this._state.value },
      );
    }

    if (params.reservePercent !== undefined) this._reservePercent = params.reservePercent;
    if (params.testPercent !== undefined) this._testPercent = params.testPercent;
    if (params.debugPercent !== undefined) this._debugPercent = params.debugPercent;
    if (params.mgmtPercent !== undefined) this._mgmtPercent = params.mgmtPercent;

    this.validatePercentSum();
    this._updatedAt = new Date();
  }

  /** Обновить норму рабочих часов */
  updateWorkHours(hours: number | null): void {
    if (!this.canEditPlan()) {
      throw new DomainStateError(
        'Cannot update work hours when plan is not editable',
        { currentState: this._state.value },
      );
    }
    this._workHoursPerMonth = hours;
    this._updatedAt = new Date();
  }

  /** Обновить фильтры */
  updateFilters(params: {
    employeeFilter?: string[] | null;
    projectFilter?: string[] | null;
    priorityFilter?: string[] | null;
  }): void {
    if (!this.canEditPlan()) {
      throw new DomainStateError(
        'Cannot update filters when plan is not editable',
        { currentState: this._state.value },
      );
    }
    if (params.employeeFilter !== undefined) this._employeeFilter = params.employeeFilter;
    if (params.projectFilter !== undefined) this._projectFilter = params.projectFilter;
    if (params.priorityFilter !== undefined) this._priorityFilter = params.priorityFilter;
    this._updatedAt = new Date();
  }

  /** Обновить пороговые значения светофора */
  updateThresholds(yellow: Percentage | null, red: Percentage | null): void {
    this._yellowThreshold = yellow;
    this._redThreshold = red;
    this.validateThresholds();
    this._updatedAt = new Date();
  }

  /** Обновить уровень группировки */
  updateGroupingLevel(level: 'EPIC' | 'FEATURE' | 'STORY' | 'TASK' | null): void {
    this._businessGroupingLevel = level;
    this.validateGroupingLevel();
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  /** Создать новый отчётный период */
  static create(params: ReportingPeriodCreateParams): ReportingPeriod {
    return new ReportingPeriod(
      params.id ?? crypto.randomUUID(),
      params.month,
      params.year,
      PeriodState.planning(),
      params.workHoursPerMonth ?? null,
      params.reservePercent ?? null,
      params.testPercent ?? null,
      params.debugPercent ?? null,
      params.mgmtPercent ?? null,
      params.yellowThreshold ?? Percentage.fromPercent(80),
      params.redThreshold ?? Percentage.fromPercent(100),
      params.businessGroupingLevel ?? null,
      params.employeeFilter ?? null,
      params.projectFilter ?? null,
      params.priorityFilter ?? null,
      params.createdById,
      null,
      null,
      null,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: ReportingPeriodPersistenceData): ReportingPeriod {
    return new ReportingPeriod(
      data.id,
      data.month,
      data.year,
      PeriodState.fromString(data.state),
      data.workHoursPerMonth,
      data.reservePercent !== null ? Percentage.fromBasisPoints(data.reservePercent) : null,
      data.testPercent !== null ? Percentage.fromBasisPoints(data.testPercent) : null,
      data.debugPercent !== null ? Percentage.fromBasisPoints(data.debugPercent) : null,
      data.mgmtPercent !== null ? Percentage.fromBasisPoints(data.mgmtPercent) : null,
      data.yellowThreshold !== null ? Percentage.fromBasisPoints(data.yellowThreshold) : null,
      data.redThreshold !== null ? Percentage.fromBasisPoints(data.redThreshold) : null,
      data.businessGroupingLevel,
      data.employeeFilter,
      data.projectFilter,
      data.priorityFilter,
      data.createdById,
      data.closedAt,
      data.reopenedAt,
      data.reopenReason,
      data.createdAt,
      data.updatedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      month: this._month,
      year: this._year,
      state: this._state.value,
      work_hours_per_month: this._workHoursPerMonth,
      reserve_percent: this._reservePercent?.basisPoints ?? null,
      test_percent: this._testPercent?.basisPoints ?? null,
      debug_percent: this._debugPercent?.basisPoints ?? null,
      mgmt_percent: this._mgmtPercent?.basisPoints ?? null,
      yellow_threshold: this._yellowThreshold?.basisPoints ?? null,
      red_threshold: this._redThreshold?.basisPoints ?? null,
      business_grouping_level: this._businessGroupingLevel,
      employee_filter: this._employeeFilter,
      project_filter: this._projectFilter,
      priority_filter: this._priorityFilter,
      created_by_id: this._createdById,
      closed_at: this._closedAt,
      reopened_at: this._reopenedAt,
      reopen_reason: this._reopenReason,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
