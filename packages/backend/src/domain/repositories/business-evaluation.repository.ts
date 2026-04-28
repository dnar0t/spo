/**
 * BusinessEvaluationRepository Interface
 *
 * Репозиторий для работы с сущностью BusinessEvaluation.
 */
import { BusinessEvaluation } from '../entities/business-evaluation.entity';

export interface BusinessEvaluationRepository {
  /** Найти оценку по ID */
  findById(id: string): Promise<BusinessEvaluation | null>;

  /** Найти оценку по периоду и задаче */
  findByPeriodAndIssue(
    periodId: string,
    youtrackIssueId: string,
  ): Promise<BusinessEvaluation | null>;

  /** Найти все оценки по периоду */
  findByPeriod(periodId: string): Promise<BusinessEvaluation[]>;

  /** Найти оценку по evaluationKey */
  findByEvaluationKey(evaluationKey: string): Promise<BusinessEvaluation | null>;

  /** Сохранить оценку */
  save(entity: BusinessEvaluation): Promise<BusinessEvaluation>;

  /** Обновить оценку */
  update(entity: BusinessEvaluation): Promise<BusinessEvaluation>;

  /** Удалить оценку по ID */
  delete(id: string): Promise<void>;
}
