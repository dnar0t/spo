/**
 * Роли пользователей в системе
 */
export enum Role {
  /** Администратор системы */
  ADMIN = 'admin',
  /** Руководитель */
  MANAGER = 'manager',
  /** Планировщик */
  PLANNER = 'planner',
  /** Сотрудник */
  EMPLOYEE = 'employee',
  /** Наблюдатель (только чтение) */
  VIEWER = 'viewer',
}

/**
 * Роли пользователей (as const — для runtime использования)
 */
export const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  BUSINESS: 'business',
  ACCOUNTANT: 'accountant',
  VIEWER: 'viewer',
  HR: 'hr',
  FINANCE: 'finance',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/**
 * Состояния периода планирования
 */
export enum PeriodState {
  /** Черновик — период создан, но не опубликован */
  DRAFT = 'draft',
  /** Активен — период открыт для планирования */
  ACTIVE = 'active',
  /** Заморожен — изменения запрещены, идёт согласование */
  FROZEN = 'frozen',
  /** Утверждён — период закрыт, планы финальны */
  APPROVED = 'approved',
  /** Архивный — период завершён */
  ARCHIVED = 'archived',
}

/**
 * Состояния периода (as const — для runtime использования)
 */
export const PERIOD_STATE = {
  PLANNING: 'PLANNING',
  PLAN_FIXED: 'PLAN_FIXED',
  FACT_LOADED: 'FACT_LOADED',
  EVALUATIONS_DONE: 'EVALUATIONS_DONE',
  PERIOD_CLOSED: 'PERIOD_CLOSED',
  PERIOD_REOPENED: 'PERIOD_REOPENED',
} as const;

export type PeriodStateType = (typeof PERIOD_STATE)[keyof typeof PERIOD_STATE];

/**
 * Типы рабочих элементов (задач)
 */
export enum WorkItemType {
  /** Проектная задача */
  TASK = 'task',
  /** Ошибка / дефект */
  BUG = 'bug',
  /** Эпик / крупная инициатива */
  EPIC = 'epic',
  /** История (user story) */
  STORY = 'story',
  /** Подзадача */
  SUBTASK = 'subtask',
  /** Аналитика / исследование */
  RESEARCH = 'research',
  /** Поддержка */
  SUPPORT = 'support',
  /** Административная работа */
  ADMIN = 'admin',
  /** Отпуск */
  VACATION = 'vacation',
  /** Больничный */
  SICK_LEAVE = 'sick_leave',
  /** Административный день */
  DAY_OFF = 'day_off',
  /** Обучение */
  TRAINING = 'training',
}

/**
 * Типы отчётов
 */
export enum ReportType {
  /** Ежедневный отчёт */
  DAILY = 'daily',
  /** Еженедельный отчёт */
  WEEKLY = 'weekly',
  /** Ежемесячный отчёт */
  MONTHLY = 'monthly',
  /** Квартальный отчёт */
  QUARTERLY = 'quarterly',
  /** Годовой отчёт */
  YEARLY = 'yearly',
}

/**
 * Статусы отчётов
 */
export enum ReportStatus {
  /** Черновик */
  DRAFT = 'draft',
  /** Отправлен на проверку */
  SUBMITTED = 'submitted',
  /** Проверяется */
  REVIEWING = 'reviewing',
  /** Требует доработки */
  NEEDS_REVISION = 'needs_revision',
  /** Утверждён */
  APPROVED = 'approved',
  /** Отклонён */
  REJECTED = 'rejected',
}

/**
 * Статусы бизнес-процессов (workflow)
 */
export enum WorkflowStatus {
  /** Не начат */
  NOT_STARTED = 'not_started',
  /** В процессе */
  IN_PROGRESS = 'in_progress',
  /** На согласовании */
  PENDING_APPROVAL = 'pending_approval',
  /** Согласован */
  APPROVED = 'approved',
  /** Отклонён */
  REJECTED = 'rejected',
  /** Отменён */
  CANCELLED = 'cancelled',
}
