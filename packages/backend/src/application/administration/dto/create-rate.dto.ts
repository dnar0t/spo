/**
 * CreateRateDto
 *
 * DTO для создания/обновления ставки сотрудника.
 */
export class CreateRateDto {
  monthlySalary: number; // в рублях
  annualHours: number;   // в часах
  effectiveFrom: string; // ISO date string
  changeReason?: string | null;
}
