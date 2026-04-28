/**
 * ManagerEvaluationRepository Interface
 *
 * Репозиторий для работы с сущностью ManagerEvaluation.
 */
import { ManagerEvaluation } from '../entities/manager-evaluation.entity';

export interface ManagerEvaluationRepository {
  /** Найти оценку по ID */
  findById(id: string): Promise<ManagerEvaluation | null>;

  /** Найти оценку по периоду, задаче и пользователю */
  findByPeriodAndIssueAndUser(
    periodId: string,
    youtrackIssueId: string,
    userId: string,
  ): Promise<ManagerEvaluation | null>;

  /** Найти все оценки по периоду */
  findByPeriod(periodId: string): Promise<ManagerEvaluation[]>;

  /** Найти все оценки пользователя в периоде */
  findByUserAndPeriod(userId: string, periodId: string): Promise<ManagerEvaluation[]>;

  /** Сохранить оценку */
  save(entity: ManagerEvaluation): Promise<ManagerEvaluation>;

  /** Обновить оценку */
  update(entity: ManagerEvaluation): Promise<ManagerEvaluation>;

  /** Удалить оценку по ID */
  delete(id: string): Promise<void>;
}
