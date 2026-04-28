/**
 * CreatePeriodDto
 *
 * DTO для создания нового отчётного периода в модуле Sprint Planning.
 * Содержит настройки периода: нормы времени, проценты, фильтры.
 */
import {
  IsInt,
  IsOptional,
  IsArray,
  IsString,
  IsEnum,
  Min,
  Max,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

export type BusinessGroupingLevel = 'EPIC' | 'FEATURE' | 'STORY' | 'TASK';

export class CreatePeriodDto {
  /** Месяц (1–12) */
  @IsInt()
  @Min(1)
  @Max(12)
  readonly month: number;

  /** Год (2000–2100) */
  @IsInt()
  @Min(2000)
  @Max(2100)
  readonly year: number;

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

  /** Список ID сотрудников для фильтрации */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  readonly employeeIds?: string[];

  /** Фильтр по проектам (идентификаторы проектов в YouTrack) */
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
