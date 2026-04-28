/**
 * PeriodSnapshot Repository Interface (Port)
 *
 * Определяет контракт для работы со снэпшотами периодов в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { PeriodSnapshot } from '../entities/period-snapshot.entity';
import { BaseRepository } from './base.repository';

export interface PeriodSnapshotRepository extends BaseRepository<PeriodSnapshot, string> {
  /** Найти снэпшот по ID периода */
  findByPeriodId(periodId: string): Promise<PeriodSnapshot | null>;
}
