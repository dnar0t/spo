/**
 * UpdatePeriodDto
 *
 * DTO для обновления настроек существующего отчётного периода.
 * Все поля опциональны — обновляются только переданные значения.
 *
 * Проценты передаются как float (0..1), где 0.3 = 30%.
 * В БД и домене хранятся basis points (0-10000).
 */
import {
  IsOptional,
  IsInt,
  IsArray,
  IsString,
  IsEnum,
  IsNumber,
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

  /** Резерв времени как float (0..1), напр. 0.3 = 30% */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  readonly reservePercent?: number;

  /** Процент на тестирование как float (0..1) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  readonly testPercent?: number;

  /** Процент на отладку как float (0..1) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  readonly debugPercent?: number;

  /** Процент на управление как float (0..1) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  readonly mgmtPercent?: number;

  /** Жёлтый порог загрузки как float (0..1), напр. 0.8 = 80% */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  readonly yellowThreshold?: number;

  /** Красный порог загрузки как float (0..1), напр. 1.0 = 100% */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
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
