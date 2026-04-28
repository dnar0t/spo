/**
 * UpdateFormulaDto
 *
 * DTO для обновления значения формулы.
 */
export class UpdateFormulaDto {
  value: number;        // в процентах (0-100)
  changeReason?: string | null;
}
