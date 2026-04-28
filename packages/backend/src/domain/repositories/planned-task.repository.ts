/**
 * PlannedTask Repository Interface (Port)
 *
 * Определяет контракт для работы с запланированными задачами в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { PlannedTask } from '../entities/planned-task.entity';
import { BaseRepository } from './base.repository';

export interface PlannedTaskRepository extends BaseRepository<PlannedTask, string> {
  /** Найти все задачи, привязанные к указанному периоду */
  findByPeriodId(periodId: string): Promise<PlannedTask[]>;

  /** Найти задачу по номеру issue в рамках периода */
  findByIssueNumber(issueNumber: string, periodId: string): Promise<PlannedTask | null>;

  /** Найти задачи, назначенные на пользователя в рамках периода */
  findAssignedToUser(userId: string, periodId: string): Promise<PlannedTask[]>;

  /** Найти запланированные задачи (isPlanned = true) по периоду */
  findPlannedByPeriodId(periodId: string): Promise<PlannedTask[]>;

  /** Найти незапланированные задачи (isPlanned = false) по периоду */
  findUnplannedByPeriodId(periodId: string): Promise<PlannedTask[]>;

  /** Получить максимальный порядок сортировки для периода */
  findMaxSortOrder(periodId: string): Promise<number>;

  /** Удалить все задачи по идентификатору периода */
  deleteByPeriodId(periodId: string): Promise<void>;
}
