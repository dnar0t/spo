/**
 * FixPlanDto
 *
 * DTO для фиксации плана спринта (переход состояния в PLAN_FIXED).
 * Тело запроса может быть пустым или содержать метаданные фиксации.
 */
import {
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';

export class FixPlanDto {
  /** Комментарий или причина фиксации плана (опционально) */
  @IsOptional()
  @IsString()
  readonly comment?: string;

  /** Дополнительные метаданные фиксации */
  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, unknown>;
}
