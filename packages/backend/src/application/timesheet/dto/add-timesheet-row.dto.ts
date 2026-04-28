/**
 * AddTimesheetRowDto
 *
 * DTO для добавления новой строки в таймшит.
 * Содержит идентификатор задачи (issueIdReadable), источник записи и опциональные поля.
 */
import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export type AddTimesheetRowSource = 'plan' | 'worklog';

export class AddTimesheetRowDto {
  /** Идентификатор задачи в читаемом формате (например, SPO-1234) */
  @IsString()
  readonly issueIdReadable: string;

  /** Источник строки: из плана (plan) или из worklog (worklog) */
  @IsEnum(['plan', 'worklog'] as const)
  readonly source: AddTimesheetRowSource;

  /** Количество минут, затраченных на задачу */
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly minutes?: number;

  /** Комментарий к строке */
  @IsOptional()
  @IsString()
  readonly comment?: string;

  /** Оценка руководителя */
  @IsOptional()
  @IsEnum(['none', 'satisfactory', 'good', 'excellent'] as const)
  readonly managerGrade?: string;

  /** Оценка бизнеса */
  @IsOptional()
  @IsEnum(['none', 'no_benefit', 'direct', 'obvious'] as const)
  readonly businessGrade?: string;
}
