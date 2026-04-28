/**
 * UpdatePlanningSettingsDto
 *
 * DTO для обновления настроек планирования по умолчанию.
 * Проценты передаются в человеческом виде (0-100).
 */
export class UpdatePlanningSettingsDto {
  workHoursPerMonth?: number | null;    // в часах
  reservePercent?: number | null;       // в процентах (0-100)
  testPercent?: number | null;          // в процентах (0-100)
  debugPercent?: number | null;         // в процентах (0-100)
  mgmtPercent?: number | null;          // в процентах (0-100)
  yellowThreshold?: number | null;      // в процентах (0-100)
  redThreshold?: number | null;         // в процентах (0-100)
  businessGroupingLevel?: string | null;
}
