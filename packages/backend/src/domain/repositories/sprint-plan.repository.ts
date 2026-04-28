/**
 * SprintPlan Repository Interface (Port)
 *
 * Определяет контракт для работы с планами спринтов в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { SprintPlan } from '../entities/sprint-plan.entity';
import { BaseRepository } from './base.repository';

export interface SprintPlanRepository extends BaseRepository<SprintPlan, string> {
  /** Найти активный план по идентификатору периода */
  findByPeriodId(periodId: string): Promise<SprintPlan | null>;

  /** Найти все версии планов по идентификатору периода */
  findVersionsByPeriodId(periodId: string): Promise<SprintPlan[]>;

  /** Получить номер последней версии плана для периода */
  findLatestVersion(periodId: string): Promise<number>;
}
