/**
 * UpdateEvaluationScaleDto
 *
 * DTO для обновления шкалы оценок.
 */
export class UpdateEvaluationScaleDto {
  name?: string;
  percent?: number;   // в процентах (0-100)
  isDefault?: boolean;
}
