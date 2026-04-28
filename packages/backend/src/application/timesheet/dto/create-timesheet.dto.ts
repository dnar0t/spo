/**
 * CreateTimesheetDto
 *
 * DTO для создания нового табеля (timesheet) сотрудника за месяц.
 * Используется в use case'ах и контроллерах.
 */
import { IsInt, IsString, Min, Max } from 'class-validator';

export class CreateTimesheetDto {
  /** ID сотрудника в системе */
  @IsString()
  readonly employeeId: string;

  /** Год (2000–2100) */
  @IsInt()
  @Min(2000)
  @Max(2100)
  readonly year: number;

  /** Месяц (1–12) */
  @IsInt()
  @Min(1)
  @Max(12)
  readonly month: number;
}
