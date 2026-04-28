/**
 * SummaryReportRepository Interface
 *
 * Репозиторий для работы с сущностью SummaryReport.
 */
import { SummaryReport } from '../entities/summary-report.entity';

export interface SummaryReportRepository {
  /** Найти строку итогового отчёта по ID */
  findById(id: string): Promise<SummaryReport | null>;

  /** Найти все строки итогового отчёта по ID периода */
  findByPeriodId(periodId: string): Promise<SummaryReport[]>;

  /** Найти строки итогового отчёта по ID периода с группировкой */
  findByPeriodGrouped(periodId: string, groupByLevel: string): Promise<SummaryReport[]>;

  /** Сохранить одну строку итогового отчёта */
  save(entity: SummaryReport): Promise<SummaryReport>;

  /** Сохранить множество строк итогового отчёта */
  saveMany(entities: SummaryReport[]): Promise<void>;

  /** Удалить все строки итогового отчёта по ID периода */
  deleteByPeriodId(periodId: string): Promise<void>;

  /** Удалить строку итогового отчёта по ID */
  delete(id: string): Promise<void>;
}
