/**
 * PersonalReportRepository Interface
 *
 * Репозиторий для работы с сущностью PersonalReport.
 */
import { PersonalReport } from '../entities/personal-report.entity';

export interface PersonalReportRepository {
  /** Найти строку отчёта по ID */
  findById(id: string): Promise<PersonalReport | null>;

  /** Найти все строки отчёта по ID периода */
  findByPeriodId(periodId: string): Promise<PersonalReport[]>;

  /** Найти строки отчёта по ID периода и ID пользователя */
  findByPeriodAndUserId(periodId: string, userId: string): Promise<PersonalReport[]>;

  /** Найти строки отчёта по ID периода и ID issue */
  findByPeriodAndIssue(periodId: string, youtrackIssueId: string): Promise<PersonalReport[]>;

  /** Сохранить одну строку отчёта */
  save(entity: PersonalReport): Promise<PersonalReport>;

  /** Сохранить множество строк отчёта */
  saveMany(entities: PersonalReport[]): Promise<void>;

  /** Обновить строку отчёта */
  update(entity: PersonalReport): Promise<PersonalReport>;

  /** Обновить множество строк отчёта (например, для заморозки) */
  updateMany(ids: string[], data: { isFrozen?: boolean; frozenAt?: Date | null }): Promise<void>;

  /** Удалить все строки отчёта по ID периода */
  deleteByPeriodId(periodId: string): Promise<void>;

  /** Удалить строку отчёта по ID */
  delete(id: string): Promise<void>;
}
