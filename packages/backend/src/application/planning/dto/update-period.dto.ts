/**
 * UpdatePeriodDto
 *
 * DTO для обновления настроек существующего отчётного периода.
 * Все поля опциональны — обновляются только переданные значения.
 */
import {
  IsOptional,
  IsInt,
  IsArray,
  IsString,
  IsEnum,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { BusinessGroupingLevel } from './create-period.dto';

export class UpdatePeriodDto {
  /** Норма рабочих часов в месяц */
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly workHoursPerMonth?: number;

  /** Резерв времени в процентах (basis points: 1000 = 10%) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly reservePercent?: number;

  /** Процент на тестирование (basis points) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly testPercent?: number;

  /** Процент на отладку (basis points) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly debugPercent?: number;

  /** Процент на управление (basis points) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly mgmtPercent?: number;

  /** Жёлтый порог загрузки (basis points: 8000 = 80%) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly yellowThreshold?: number;

  /** Красный порог загрузки (basis points: 10000 = 100%) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  readonly redThreshold?: number;

  /** Уровень группировки бизнес-задач */
  @IsOptional()
  @IsEnum(['EPIC', 'FEATURE', 'STORY', 'TASK'] as const)
  readonly businessGroupingLevel?: BusinessGroupingLevel;

  /** Фильтр по сотрудникам */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly employeeFilter?: string[];

  /** Фильтр по проектам */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly projectFilter?: string[];

  /** Фильтр по приоритетам */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly priorityFilter?: string[];
}
