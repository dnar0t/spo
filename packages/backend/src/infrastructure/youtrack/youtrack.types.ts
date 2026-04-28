/**
 * YouTrack API — типы ответов REST API
 *
 * @see https://www.jetbrains.com/help/youtrack/devportal/api-entity-User.html
 * @see https://www.jetbrains.com/help/youtrack/devportal/api-entity-Issue.html
 * @see https://www.jetbrains.com/help/youtrack/devportal/api-entity-WorkItem.html
 */

// ─── User ───

/** Пользователь YouTrack (Hub) */
export interface YouTrackUser {
  id: string;
  login: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  banned?: boolean;
  guest?: boolean;
  online?: boolean;
  ringId?: string;
}

// ─── Issue ───

/** Базовое поле YouTrack */
export interface YouTrackFieldValue {
  id: string;
  name: string;
  localizedName?: string;
}

/** Пользовательское поле */
export interface YouTrackCustomField {
  id: string;
  name: string;
  value: YouTrackFieldValue | YouTrackFieldValue[] | null;
  $type: string;
}

/** Проект YouTrack */
export interface YouTrackProject {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  iconUrl?: string;
  archived?: boolean;
}

/** Задача YouTrack */
export interface YouTrackIssue {
  id: string;
  idReadable: string; // TEST-123
  summary: string;
  description?: string;
  created: number; // timestamp
  updated: number; // timestamp
  resolved: boolean;
  numberInProject?: number;
  project?: YouTrackProject;
  reporter?: YouTrackUser;
  assignee?: YouTrackUser;
  updater?: YouTrackUser;
  customFields?: YouTrackCustomField[];
  parent?: { id: string; idReadable: string };
  subtasks?: { id: string; idReadable: string }[];
  $type: string;
}

// ─── Work Item ───

/** Тип работы */
export interface YouTrackWorkItemType {
  id: string;
  name: string;
  $type: string;
}

/** Элемент трудозатрат (Work Item) */
export interface YouTrackWorkItem {
  id: string;
  author?: YouTrackUser;
  creator?: YouTrackUser;
  text?: string;
  textPreview?: string;
  type?: YouTrackWorkItemType;
  duration: YouTrackDuration;
  date: number; // timestamp (дата, когда была выполнена работа)
  created: number; // timestamp
  updated: number; // timestamp
  issue?: { id: string; idReadable: string };
  $type: string;
}

/** Длительность в YouTrack (в минутах) */
export interface YouTrackDuration {
  id?: string;
  presentation?: string; // "2h 30m"
  minutes: number;
  $type: string;
}

// ─── Agile Board / Sprint ───

/** Agile доска */
export interface YouTrackAgileBoard {
  id: string;
  name: string;
  columns?: YouTrackAgileColumn[];
  sprints?: YouTrackSprint[];
  $type: string;
}

/** Колонка Agile доски */
export interface YouTrackAgileColumn {
  id: string;
  name: string;
  isVisible: boolean;
  $type: string;
}

/** Спринт */
export interface YouTrackSprint {
  id: string;
  name: string;
  start: number; // timestamp
  finish: number; // timestamp
  archived?: boolean;
  $type: string;
}

// ─── Issue fields mapping ───

/** Маппинг пользовательских полей YouTrack → система СПО */
export interface YouTrackFieldMapping {
  systemFieldId: string;   // ID custom field "Система"
  sprintFieldId: string;    // ID custom field "Спринт"
  typeFieldId: string;      // ID custom field "Type"
  priorityFieldId: string;  // ID custom field "Priority"
  businessValueFieldId?: string; // ID custom field "Бизнес-ценность"
}

// ─── Issue query params ───

/** Параметры запроса задач */
export interface YouTrackIssueQueryParams {
  query?: string;
  fields?: string;
  $skip?: number;
  $top?: number;
}

/** Параметры запроса work items */
export interface YouTrackWorkItemQueryParams {
  fields?: string;
  $skip?: number;
  $top?: number;
}

// ─── Sync result ───

/** Результат синхронизации одного типа сущностей */
export interface YouTrackSyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{
    entityId?: string;
    message: string;
  }>;
}

/** Общий результат синхронизации */
export interface YouTrackFullSyncResult {
  users: YouTrackSyncResult;
  projects: YouTrackSyncResult;
  issues: YouTrackSyncResult;
  workItems: YouTrackSyncResult;
  startedAt: string;
  completedAt: string;
  duration: number; // секунды
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

// ─── Sync configuration ───

/** Конфигурация интеграции */
export interface YouTrackSyncConfig {
  baseUrl: string;
  apiToken: string;
  projects: string[];
  searchQuery?: string;
  agileBoardId?: string;
  sprintFieldId?: string;
  syncInterval: string; // cron expression
  batchSize: number;
  requestTimeout: number;
  retryCount: number;
  fieldMapping?: YouTrackFieldMapping;
  isActive: boolean;
}
