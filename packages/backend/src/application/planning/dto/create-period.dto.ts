/**
 * CreatePeriodDto
 *
 * DTO для создания нового отчётного периода в модуле Sprint Planning.
 * Содержит настройки периода: нормы времени, проценты, фильтры.
 *
 * Проценты передаются как float (0..1), где 0.3 = 30%.
 * В БД и домене хранятся basis points (0-10000).
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
  IsNumber,
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
