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
    this.validateTransition();
    this.validateUser();
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

  // ─── Фабричный метод ───

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
