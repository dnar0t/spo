/**
 * IYouTrackIssueRepository (Port)
 *
 * Порт для работы с YouTrackIssue в контексте финансовых расчётов.
 * Позволяет получать задачи периода и иерархию задач (parent-child).
 */
import { YouTrackIssueDto, IssueHierarchyDto } from '../dto/youtrack-issue.dto';

export const YOUTRACK_ISSUE_REPOSITORY = 'YOUTRACK_ISSUE_REPOSITORY';

export interface IYouTrackIssueRepository {
  /** Найти все задачи, связанные с отчётами указанного периода */
  findByPeriodId(periodId: number): Promise<YouTrackIssueDto[]>;

  /** Получить иерархию задач (parent-child) для периода */
  findHierarchyByPeriodId(periodId: number): Promise<IssueHierarchyDto[]>;
}
