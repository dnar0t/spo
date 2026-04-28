/**
 * RateResponseDto
 *
 * DTO для ответа с данными о ставке сотрудника.
 */
export class RateResponseDto {
  id: string;
  userId: string;
  monthlySalary: number; // в рублях
  annualHours: number;   // в часах
  hourlyRate: number;    // в рублях в час
  effectiveFrom: string;
  effectiveTo: string | null;
  changedById: string;
  changeReason: string | null;
  createdAt: string;
}
