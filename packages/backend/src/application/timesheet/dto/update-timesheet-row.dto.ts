/**
 * UpdateTimesheetRowDto
 *
 * DTO для обновления существующей строки таймшита.
 * Все поля опциональны — можно обновить только нужные.
 */
import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { TimesheetRowGrade, TimesheetRowBusinessGrade } from '../../../domain/entities/timesheet-row.entity';

export class UpdateTimesheetRowDto {
  /** Количество минут, затраченных на задачу */
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly minutes?: number;

  /** Комментарий к строке */
  @IsOptional()
  @IsString()
  readonly comment?: string;

  /** Оценка руководителя */
  @IsOptional()
  @IsEnum(['none', 'satisfactory', 'good', 'excellent'] as const)
  readonly managerGrade?: TimesheetRowGrade;

  /** Бизнес-оценка */
  @IsOptional()
  @IsEnum(['none', 'no_benefit', 'direct', 'obvious'] as const)
  readonly businessGrade?: TimesheetRowBusinessGrade;
}
