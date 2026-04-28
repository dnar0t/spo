/**
 * EvaluationScale Repository Interface (Port)
 *
 * Определяет контракт для работы со шкалами оценок.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { EvaluationScale } from '../entities/evaluation-scale.entity';
import { BaseRepository } from './base.repository';

export interface EvaluationScaleRepository extends BaseRepository<EvaluationScale, string> {
  /** Найти все шкалы по типу (MANAGER, BUSINESS) */
  findByScaleType(scaleType: string): Promise<EvaluationScale[]>;

  /** Найти шкалу по умолчанию для указанного типа */
  findDefaultByType(scaleType: string): Promise<EvaluationScale | null>;
}
