/**
 * YouTrackIssueDto и IssueHierarchyDto
 *
 * DTO для передачи данных YouTrackIssue через порт репозитория.
 * Используются в финансовых use cases для группировки по system/project
 * и построения дерева иерархии.
 */
import { PeriodGroupItemTotals } from '../use-cases/get-period-groups.use-case';

/**
 * Плоское представление задачи YouTrack.
 */
export interface YouTrackIssueDto {
  id: string;
  youtrackId: string;
  issueNumber: string;
  summary: string;
  projectName: string | null;
  systemName: string | null;
  sprintName: string | null;
  typeName: string | null;
  parentIssueId: string | null;
  parentYtId: string | null;
  estimationMinutes: number | null;
}

/**
 * Узел иерархии задач.
 * Содержит агрегированные финансовые показатели для поддерева.
 */
export interface IssueHierarchyDto {
  issueId: string;
  issueNumber: string;
  summary: string;
  typeName: string | null;
  parentIssueId: string | null;
  /** Список youtrackIssueId из PersonalReportLine, попавших в этот узел */
  reportIssueIds: string[];
  children: IssueHierarchyDto[];
  totals: PeriodGroupItemTotals | null;
}

/**
 * Тип узла иерархии (для группировки).
 */
export type IssueNodeType = 'EPIC' | 'FEATURE' | 'STORY' | 'TASK' | 'SUBTASK';
