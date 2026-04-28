/**
 * FreezeFinancials DTO
 *
 * DTO для запроса и ответа заморозки финансовых данных в личных отчётах.
 */

export class FreezeFinancialsRequestDto {
  readonly periodId: string;
}

export class FreezeFinancialsResponseDto {
  readonly periodId: string;
  readonly frozenLineIds: string[];
  readonly frozenCount: number;
  readonly totalCostBeforeFreeze: number;
  readonly totalCostAfterFreeze: number;
  readonly frozenAt: string;
}
