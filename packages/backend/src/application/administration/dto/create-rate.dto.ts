/**
 * CreateRateDto
 *
 * DTO для создания/обновления ставки сотрудника.
 * Поддерживает как старые имена полей (monthlySalary, annualHours),
 * так и новые (monthlyNetRub, workHoursPerYear) для совместимости с фронтом.
 */
export class CreateRateDto {
  monthlySalary: number; // в рублях
  annualHours: number; // в часах
  monthlyNetRub: number; // алиас monthlySalary (в рублях)
  workHoursPerYear: number; // алиас annualHours (в часах)
  effectiveFrom: string; // ISO date string
  changeReason?: string | null;
}
