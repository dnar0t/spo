/**
 * AssignTaskDto
 *
 * DTO для назначения задачи на сотрудника в рамках отчётного периода.
 * Часы указываются в «человеческих» единицах (часы), внутри use case
 * они будут преобразованы в Minutes (минуты) доменного слоя.
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator';

export class AssignTaskDto {
  /** ID сотрудника, на которого назначается задача */
  @IsString()
  @MinLength(1)
  readonly assigneeId: string;

  /** Количество запланированных часов (dev) */
  @IsNumber()
  @Min(0)
  readonly plannedHours: number;

  /** Часы на отладку (опционально) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly debugHours?: number;

  /** Часы на тестирование (опционально) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly testHours?: number;

  /** Часы на управление (опционально) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly mgmtHours?: number;
}
