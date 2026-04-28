/**
 * PeriodState Value Object
 *
 * Строго типизированный enum-like VO для состояний периода планирования.
 * Реализует стейт-машину с правилами переходов между состояниями.
 */
export class PeriodState {
  private constructor(private readonly _value: PeriodStateValue) {
    if (!PeriodState.VALUES.includes(_value)) {
      throw new Error(`Invalid PeriodState value: ${_value}`);
    }
  }

  // ─── Допустимые значения ───

  static readonly PLANNING = 'PLANNING' as const;
  static readonly PLAN_FIXED = 'PLAN_FIXED' as const;
  static readonly FACT_LOADED = 'FACT_LOADED' as const;
  static readonly EVALUATIONS_DONE = 'EVALUATIONS_DONE' as const;
  static readonly PERIOD_CLOSED = 'PERIOD_CLOSED' as const;
  static readonly PERIOD_REOPENED = 'PERIOD_REOPENED' as const;

  /** Массив всех возможных состояний */
  static readonly VALUES: readonly PeriodStateValue[] = [
    PeriodState.PLANNING,
    PeriodState.PLAN_FIXED,
    PeriodState.FACT_LOADED,
    PeriodState.EVALUATIONS_DONE,
    PeriodState.PERIOD_CLOSED,
    PeriodState.PERIOD_REOPENED,
  ] as const;

  // ─── Статические константы (экземпляры) ───

  static readonly PLANNING_STATE = new PeriodState(PeriodState.PLANNING);
  static readonly PLAN_FIXED_STATE = new PeriodState(PeriodState.PLAN_FIXED);
  static readonly FACT_LOADED_STATE = new PeriodState(PeriodState.FACT_LOADED);
  static readonly EVALUATIONS_DONE_STATE = new PeriodState(PeriodState.EVALUATIONS_DONE);
  static readonly PERIOD_CLOSED_STATE = new PeriodState(PeriodState.PERIOD_CLOSED);
  static readonly PERIOD_REOPENED_STATE = new PeriodState(PeriodState.PERIOD_REOPENED);

  // ─── Фабричные методы ───

  static fromString(value: string): PeriodState {
    const state = new PeriodState(value as PeriodStateValue);
    return state;
  }

  static planning(): PeriodState {
    return PeriodState.PLANNING_STATE;
  }

  static planFixed(): PeriodState {
    return PeriodState.PLAN_FIXED_STATE;
  }

  static factLoaded(): PeriodState {
    return PeriodState.FACT_LOADED_STATE;
  }

  static evaluationsDone(): PeriodState {
    return PeriodState.EVALUATIONS_DONE_STATE;
  }

  static periodClosed(): PeriodState {
    return PeriodState.PERIOD_CLOSED_STATE;
  }

  static periodReopened(): PeriodState {
    return PeriodState.PERIOD_REOPENED_STATE;
  }

  // ─── Геттеры ───

  get value(): string {
    return this._value;
  }

  // ─── Бизнес-логика ───

  /**
   * Можно ли редактировать план в этом состоянии?
   * Редактирование плана возможно только в состоянии PLANNING
   * или после переоткрытия периода (PERIOD_REOPENED).
   */
  isEditable(): boolean {
    return this._value === PeriodState.PLANNING || this._value === PeriodState.PERIOD_REOPENED;
  }

  /**
   * Стейт-машина: проверка возможности перехода в целевое состояние.
   *
   * Правила переходов:
   *   PLANNING        → PLAN_FIXED | PERIOD_CLOSED
   *   PLAN_FIXED      → FACT_LOADED | PERIOD_CLOSED | PERIOD_REOPENED
   *   FACT_LOADED     → EVALUATIONS_DONE | PERIOD_CLOSED | PERIOD_REOPENED
   *   EVALUATIONS_DONE → PERIOD_CLOSED | PERIOD_REOPENED
   *   PERIOD_CLOSED   → PERIOD_REOPENED
   *   PERIOD_REOPENED → PLAN_FIXED | PERIOD_CLOSED
   */
  canTransitionTo(target: PeriodState): boolean {
    return PeriodState.TRANSITIONS[this._value]?.includes(target._value) ?? false;
  }

  /** Карта разрешённых переходов */
  private static readonly TRANSITIONS: Record<PeriodStateValue, readonly PeriodStateValue[]> = {
    [PeriodState.PLANNING]: [PeriodState.PLAN_FIXED, PeriodState.PERIOD_CLOSED],
    [PeriodState.PLAN_FIXED]: [
      PeriodState.FACT_LOADED,
      PeriodState.PERIOD_CLOSED,
      PeriodState.PERIOD_REOPENED,
    ],
    [PeriodState.FACT_LOADED]: [
      PeriodState.EVALUATIONS_DONE,
      PeriodState.PERIOD_CLOSED,
      PeriodState.PERIOD_REOPENED,
    ],
    [PeriodState.EVALUATIONS_DONE]: [PeriodState.PERIOD_CLOSED, PeriodState.PERIOD_REOPENED],
    [PeriodState.PERIOD_CLOSED]: [PeriodState.PERIOD_REOPENED],
    [PeriodState.PERIOD_REOPENED]: [PeriodState.PLAN_FIXED, PeriodState.PERIOD_CLOSED],
  };

  // ─── Сравнение ───

  equals(other: PeriodState): boolean {
    return this._value === other._value;
  }

  // ─── Сериализация ───

  toJSON(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}

/** Тип для значений состояний периода */
export type PeriodStateValue =
  | 'PLANNING'
  | 'PLAN_FIXED'
  | 'FACT_LOADED'
  | 'EVALUATIONS_DONE'
  | 'PERIOD_CLOSED'
  | 'PERIOD_REOPENED';
