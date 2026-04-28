/**
 * RateResponseDto
 *
 * DTO для ответа с данными о ставке сотрудника.
 * Возвращает поля в обоих именованиях для совместимости с фронтом.
 */
export class RateResponseDto {
  id: string;
  userId: string;
  monthlySalary: number; // в рублях (старое имя)
  monthlyNetRub: number; // в рублях (новое имя, алиас monthlySalary)
  annualHours: number; // в часах (старое имя)
  workHoursPerYear: number; // в часах (новое имя, алиас annualHours)
  hourlyRate: number; // в рублях в час
  effectiveFrom: string;
  effectiveTo: string | null;
  changedById: string;
  changeReason: string | null;
  createdAt: string;
}
