/**
 * PeriodTransition Entity (Domain Layer)
 *
 * Сущность для аудита переходов между состояниями отчётного периода.
 * Фиксирует каждый переход, инициатора и причину.
 */
import { PeriodState } from '../value-objects/period-state.vo';
import { InvalidArgumentError } from '../errors/domain.error';

export interface PeriodTransitionCreateParams {
  id?: string;
  periodId: string;
  fromState: PeriodState;
  toState: PeriodState;
  transitionedByUserId: string;
  reason?: string | null;
  transitionedAt?: Date;
}

export interface PeriodTransitionPersistenceData {
  id: string;
  periodId: string;
  fromState: string;
  toState: string;
  transitionedByUserId: string;
  reason: string | null;
  transitionedAt: Date;
}

export class PeriodTransition {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private readonly _fromState: PeriodState,
    private readonly _toState: PeriodState,
    private readonly _transitionedByUserId: string,
    private readonly _reason: string | null,
    private readonly _transitionedAt: Date,
  ) {
    this.validateUser();
    // Если fromState === toState, это аудит-запись (не переход),
    // поэтому validateTransition() не вызываем — стейт-машина не позволяет
    // переходить в то же состояние.
    if (this._fromState.value !== this._toState.value) {
      this.validateTransition();
    }
  }

  // ─── Валидация ───

  private validateTransition(): void {
    if (!this._fromState.canTransitionTo(this._toState)) {
      throw new InvalidArgumentError(
        'transition',
        `Invalid transition from ${this._fromState.value} to ${this._toState.value}`,
        {
          fromState: this._fromState.value,
          toState: this._toState.value,
          periodId: this._periodId,
        },
      );
    }
  }

  private validateUser(): void {
    if (!this._transitionedByUserId || this._transitionedByUserId.trim().length === 0) {
      throw new InvalidArgumentError(
        'transitionedByUserId',
        'Transition must have a valid user ID',
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

  get fromState(): PeriodState {
    return this._fromState;
  }

  get toState(): PeriodState {
    return this._toState;
  }

  get transitionedByUserId(): string {
    return this._transitionedByUserId;
  }

  get reason(): string | null {
    return this._reason;
  }

  get transitionedAt(): Date {
    return this._transitionedAt;
  }

  /** Проверка, был ли переход на закрытие периода */
  isClosure(): boolean {
    return this._toState.value === 'PERIOD_CLOSED';
  }

  /** Проверка, был ли переход на переоткрытие периода */
  isReopening(): boolean {
    return this._toState.value === 'PERIOD_REOPENED';
  }

  /** Проверка, был ли переход на фиксацию плана */
  isPlanFix(): boolean {
    return this._toState.value === 'PLAN_FIXED';
  }

  /** Проверка, был ли это аудит модификации плана (без смены состояния) */
  isPlanModification(): boolean {
    return this._fromState.value === this._toState.value;
  }

  // ─── Фабричные методы ───

  /** Создать новую запись о переходе */
  static create(params: PeriodTransitionCreateParams): PeriodTransition {
    return new PeriodTransition(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.fromState,
      params.toState,
      params.transitionedByUserId,
      params.reason ?? null,
      params.transitionedAt ?? new Date(),
    );
  }

  /**
   * Создать аудит-запись модификации плана (без смены состояния).
   * Используется когда план уже зафиксирован, но директор вносит изменения.
   * В этом случае fromState === toState, что не является переходом,
   * поэтому валидация стейт-машины не применяется.
   */
  static forAudit(params: {
    id?: string;
    periodId: string;
    state: PeriodState;
    transitionedByUserId: string;
    reason: string | null;
    transitionedAt?: Date;
  }): PeriodTransition {
    const id = params.id ?? crypto.randomUUID();
    const transitionedAt = params.transitionedAt ?? new Date();

    if (!params.transitionedByUserId || params.transitionedByUserId.trim().length === 0) {
      throw new InvalidArgumentError(
        'transitionedByUserId',
        'Transition must have a valid user ID',
      );
    }

    // Создаём через приватный конструктор, минуя validateTransition(),
    // так как fromState === toState — это аудит, а не переход.
    return new PeriodTransition(
      id,
      params.periodId,
      params.state,
      params.state,
      params.transitionedByUserId,
      params.reason,
      transitionedAt,
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: PeriodTransitionPersistenceData): PeriodTransition {
    return new PeriodTransition(
      data.id,
      data.periodId,
      PeriodState.fromString(data.fromState),
      PeriodState.fromString(data.toState),
      data.transitionedByUserId,
      data.reason,
      data.transitionedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      from_state: this._fromState.value,
      to_state: this._toState.value,
      transitioned_by_user_id: this._transitionedByUserId,
      reason: this._reason,
      transitioned_at: this._transitionedAt,
    };
  }
}
