/**
 * UpdatePlanningSettingsDto
 *
 * DTO для обновления настроек планирования по умолчанию.
 * Проценты передаются как float (0..1), где 0.3 = 30%.
 * В БД хранятся basis points (0-10000).
 */
export class UpdatePlanningSettingsDto {
  workHoursPerMonth?: number | null; // в часах
  reservePercent?: number | null; // как float (0..1), напр. 0.3 = 30%
  testPercent?: number | null; // как float (0..1), напр. 0.2 = 20%
  debugPercent?: number | null; // как float (0..1), напр. 0.3 = 30%
  mgmtPercent?: number | null; // как float (0..1), напр. 0.1 = 10%
  yellowThreshold?: number | null; // как float (0..1), напр. 0.8 = 80%
  redThreshold?: number | null; // как float (0..1), напр. 1.0 = 100%
  businessGroupingLevel?: string | null;
}
