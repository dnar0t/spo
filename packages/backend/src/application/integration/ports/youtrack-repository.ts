/**
 * IYouTrackRepository — порт (интерфейс) для взаимодействия с YouTrack-интеграцией.
 *
 * Определяет контракт между application и infrastructure слоями.
 * Реализация находится в infrastructure/youtrack/services/youtrack-repository.impl.ts
 */

// ─── DTOs ───

export interface YouTrackStatusDto {
  configured: boolean;
  baseUrl: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

export interface YouTrackTestConnectionResultDto {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface StartSyncResultDto {
  message: string;
  syncRunId?: string;
}

export interface SyncRunDto {
  id: string;
  triggerType: string;
  status: string;
  totalIssues: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
}

export interface SyncRunsListDto {
  data: SyncRunDto[];
  total: number;
}

export interface SyncLogEntryDto {
  id: string;
  level: string;
  message: string;
  entityType: string | null;
  createdAt: Date;
}

export interface SyncRunDetailDto {
  id: string;
  triggerType: string;
  status: string;
  totalIssues: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: Record<string, unknown> | null;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  logs: SyncLogEntryDto[];
}

export interface YouTrackIssueDto {
  id: string;
  issueNumber: string;
  summary: string;
  projectName: string | null;
  systemName: string | null;
  typeName: string | null;
  stateName: string | null;
  isResolved: boolean;
  assigneeId: string | null;
  estimationMinutes: number | null;
  parentIssueId: string | null;
  lastSyncAt: Date | null;
  updatedAt: Date;
}

export interface YouTrackIssuesListDto {
  data: YouTrackIssueDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface YouTrackStatsDto {
  totalIssues: number;
  totalWorkItems: number;
  totalUsers: number;
  lastSyncRun: {
    status: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null;
  issuesByProject: Record<string, number>;
  issuesByState: Record<string, number>;
}

export interface SyncRunFilter {
  limit: number;
  offset: number;
}

export interface IssueFilter {
  page: number;
  limit: number;
  projectName?: string;
  systemName?: string;
  assigneeId?: string;
  isResolved?: boolean;
  search?: string;
}

// ─── Port ───

export const YOUTRACK_REPOSITORY = Symbol('YOUTRACK_REPOSITORY');

export interface IYouTrackRepository {
  /** Получить статус подключения к YouTrack */
  getStatus(): Promise<YouTrackStatusDto>;

  /** Проверить соединение с YouTrack API */
  testConnection(): Promise<YouTrackTestConnectionResultDto>;

  /** Запустить полную синхронизацию */
  startSync(periodId?: number): Promise<StartSyncResultDto>;

  /** Получить историю синхронизаций */
  getSyncRuns(filter: SyncRunFilter): Promise<SyncRunsListDto>;

  /** Получить детали конкретной синхронизации */
  getSyncRunDetail(id: string): Promise<SyncRunDetailDto | null>;

  /** Получить список синхронизированных задач */
  getIssues(filter: IssueFilter): Promise<YouTrackIssuesListDto>;

  /** Получить статистику по интеграции */
  getStats(): Promise<YouTrackStatsDto>;
}
