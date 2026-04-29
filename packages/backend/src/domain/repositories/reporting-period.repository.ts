/**
 * ReportingPeriod Repository Interface (Port)
 *
 * Определяет контракт для работы с отчётными периодами в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { ReportingPeriod } from '../entities/reporting-period.entity';
import { BaseRepository } from './base.repository';

export interface ReportingPeriodRepository extends BaseRepository<ReportingPeriod, string> {
  /** Найти период по месяцу и году */
  findByMonthYear(month: number, year: number): Promise<ReportingPeriod | null>;

  /** Найти все периоды за указанный год */
  findAllByYear(year: number): Promise<ReportingPeriod[]>;

  /** Найти все периоды, отсортированные по дате (от новых к старым) */
  findAllOrderedByDate(): Promise<ReportingPeriod[]>;

  /** Найти самый последний (по дате создания) период */
  findLatest(): Promise<ReportingPeriod | null>;

  /**
   * Найти предыдущий период относительно указанного.
   * Предыдущим считается период с тем же годом, месяцем на 1 меньше,
   * или декабрь предыдущего года для января.
   */
  findPreviousPeriod(periodId: string): Promise<ReportingPeriod | null>;
}
