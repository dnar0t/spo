/**
 * SprintPlan Entity (Domain Layer)
 *
 * Сущность зафиксированного плана спринта (версии плана).
 * Содержит бизнес-правила фиксации, отмены фиксации и аудита изменений плана.
 */
import { Minutes } from '../value-objects/minutes.vo';
import { InvalidArgumentError, DomainStateError } from '../errors/domain.error';

export interface SprintPlanCreateParams {
  id?: string;
  periodId: string;
  versionNumber?: number;
  isFixed?: boolean;
  fixedAt?: Date | null;
  fixedByUserId?: string | null;
  fixedPlanHistory?: string | null;
  totalPlannedMinutes?: Minutes;
  taskCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SprintPlanPersistenceData {
  id: string;
  periodId: string;
  versionNumber: number;
  isFixed: boolean;
  fixedAt: Date | null;
  fixedByUserId: string | null;
  fixedPlanHistory: string | null;
  totalPlannedMinutes: number;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class SprintPlan {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private _versionNumber: number,
    private _isFixed: boolean,
    private _fixedAt: Date | null,
    private _fixedByUserId: string | null,
    private _fixedPlanHistory: string | null,
    private _totalPlannedMinutes: Minutes,
    private _taskCount: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.validateVersionNumber();
    this.validateFixedState();
    this.validateTaskCount();
  }

  // ─── Валидация ───

  private validateVersionNumber(): void {
    if (!Number.isInteger(this._versionNumber) || this._versionNumber < 1) {
      throw new InvalidArgumentError(
        'versionNumber',
        `Version number must be a positive integer. Got: ${this._versionNumber}`,
      );
    }
  }

  private validateFixedState(): void {
    if (this._isFixed && !this._fixedAt) {
      throw new InvalidArgumentError(
        'fixedAt',
        'Fixed plan must have a fixedAt date',
      );
    }
    if (this._isFixed && !this._fixedByUserId) {
      throw new InvalidArgumentError(
        'fixedByUserId',
        'Fixed plan must have a fixedByUserId',
      );
    }
    if (!this._isFixed && this._fixedAt) {
      throw new InvalidArgumentError(
        'fixedAt',
        'Non-fixed plan should not have a fixedAt date',
      );
    }
    if (!this._isFixed && this._fixedByUserId) {
      throw new InvalidArgumentError(
        'fixedByUserId',
        'Non-fixed plan should not have a fixedByUserId',
      );
    }
  }

  private validateTaskCount(): void {
    if (!Number.isInteger(this._taskCount) || this._taskCount < 0) {
      throw new InvalidArgumentError(
        'taskCount',
        `Task count must be a non-negative integer. Got: ${this._taskCount}`,
      );
    }
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get periodId(): string {
    return this._periodId;
  }

  get versionNumber(): number {
    return this._versionNumber;
  }

  get isFixed(): boolean {
    return this._isFixed;
  }

  get fixedAt(): Date | null {
    return this._fixedAt;
  }

  get fixedByUserId(): string | null {
    return this._fixedByUserId;
  }

  get fixedPlanHistory(): string | null {
    return this._fixedPlanHistory;
  }

  get totalPlannedMinutes(): Minutes {
    return this._totalPlannedMinutes;
  }

  get taskCount(): number {
    return this._taskCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /**
   * Зафиксировать план.
   * При фиксации сохраняется предыдущая версия плана (если была)
   * и обновляется номер версии.
   */
  fix(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new InvalidArgumentError('userId', 'User ID cannot be empty');
    }

    if (this._isFixed) {
      throw new DomainStateError('Plan is already fixed', {
        planId: this._id,
        versionNumber: this._versionNumber,
      });
    }

    // Сохраняем предыдущую версию для аудита
    const history = this.buildHistorySnapshot();
    this._fixedPlanHistory = history;

    this._isFixed = true;
    this._fixedAt = new Date();
    this._fixedByUserId = userId;
    this._versionNumber += 1;
    this._updatedAt = new Date();
  }

  /**
   * Отменить фиксацию плана (только для директора).
   * Восстанавливает предыдущую версию плана.
   */
  unfix(): void {
    if (!this._isFixed) {
      throw new DomainStateError('Plan is not fixed, cannot unfix', {
        planId: this._id,
      });
    }

    this._isFixed = false;
    this._fixedAt = null;
    this._fixedByUserId = null;
    this._fixedPlanHistory = null;
    this._updatedAt = new Date();
  }

  /** Обновить общее количество запланированных минут */
  updateTotalPlanned(minutes: Minutes): void {
    if (minutes.isNegative) {
      throw new InvalidArgumentError(
        'totalPlannedMinutes',
        'Total planned minutes cannot be negative',
      );
    }
    this._totalPlannedMinutes = minutes;
    this._updatedAt = new Date();
  }

  /** Обновить количество задач в плане */
  updateTaskCount(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new InvalidArgumentError(
        'taskCount',
        `Task count must be a non-negative integer. Got: ${count}`,
      );
    }
    this._taskCount = count;
    this._updatedAt = new Date();
  }

  /**
   * Инкрементировать номер версии при создании новой версии плана.
   * Вызывается когда план уже зафиксирован и нужно создать новую версию.
   */
  incrementVersion(): void {
    this._versionNumber += 1;
    this._updatedAt = new Date();
  }

  /**
   * Построить JSON-слепок текущего состояния плана для истории аудита.
   */
  private buildHistorySnapshot(): string {
    return JSON.stringify({
      versionNumber: this._versionNumber,
      totalPlannedMinutes: this._totalPlannedMinutes.minutes,
      taskCount: this._taskCount,
      isFixed: this._isFixed,
      fixedAt: this._fixedAt?.toISOString() ?? null,
      fixedByUserId: this._fixedByUserId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Фабричный метод ───

  /** Создать новый план спринта */
  static create(params: SprintPlanCreateParams): SprintPlan {
    return new SprintPlan(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.versionNumber ?? 1,
      params.isFixed ?? false,
      params.fixedAt ?? null,
      params.fixedByUserId ?? null,
      params.fixedPlanHistory ?? null,
      params.totalPlannedMinutes ?? Minutes.zero(),
      params.taskCount ?? 0,
      params.createdAt ?? new Date(),
      params.updatedAt ?? new Date(),
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: SprintPlanPersistenceData): SprintPlan {
    return new SprintPlan(
      data.id,
      data.periodId,
      data.versionNumber,
      data.isFixed,
      data.fixedAt,
      data.fixedByUserId,
      data.fixedPlanHistory,
      Minutes.fromMinutes(data.totalPlannedMinutes),
      data.taskCount,
      data.createdAt,
      data.updatedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      version_number: this._versionNumber,
      is_fixed: this._isFixed,
      fixed_at: this._fixedAt,
      fixed_by_user_id: this._fixedByUserId,
      fixed_plan_history: this._fixedPlanHistory,
      total_planned_minutes: this._totalPlannedMinutes.minutes,
      task_count: this._taskCount,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
