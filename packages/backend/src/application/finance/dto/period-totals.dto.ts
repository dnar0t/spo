/**
 * PeriodTotalsDto
 *
 * DTO для итоговых сумм по отчётному периоду.
 * Используется группирующими use cases (system, project, groups)
 * как часть ответа для поля totals.
 *
 * Все суммы в копейках, время в минутах.
 */
export class PeriodTotalsDto {
  /** Суммарное запланированное время (минуты) */
  readonly totalPlannedMinutes: number;

  /** Суммарное фактическое время (минуты) */
  readonly totalActualMinutes: number;

  /** Базовая сумма оплаты (копейки) */
  readonly totalBaseAmount: number;

  /** Сумма с оценкой руководителя (копейки) */
  readonly totalManagerAmount: number;

  /** Сумма с бизнес-оценкой (копейки) */
  readonly totalBusinessAmount: number;

  /** Итого на руки (копейки) */
  readonly totalOnHand: number;

  /** Итого с налогами (копейки) */
  readonly totalWithTax: number;
}
