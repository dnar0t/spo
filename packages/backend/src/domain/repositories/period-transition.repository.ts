/**
 * PeriodTransition Repository Interface (Port)
 *
 * Определяет контракт для работы с переходами состояний периодов в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { PeriodTransition } from '../entities/period-transition.entity';
import { BaseRepository } from './base.repository';

export interface PeriodTransitionRepository extends BaseRepository<PeriodTransition, string> {
  /** Найти все переходы по идентификатору периода */
  findByPeriodId(periodId: string): Promise<PeriodTransition[]>;

  /** Найти последний (самый свежий) переход по идентификатору периода */
  findLatestByPeriodId(periodId: string): Promise<PeriodTransition | null>;
}
