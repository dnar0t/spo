// Расчёты планирования согласно ТЗ СПО v2 §9.

import type { Assignment, BacklogIssue, Employee, WorkRole } from '@/data/planningMock';

export interface SprintSettings {
  // Календарный месяц спринта.
  year: number;
  month: number; // 1..12
  // Общие рабочие часы месяца (на одного сотрудника).
  workHoursPerMonth: number;
  // Резерв на внеплановые задачи (0..1).
  reservePercent: number;
  // Проценты направлений (0..1).
  debugPercent: number; // % отладки от оценки разработки
  testingPercent: number; // % тестирования от оценки разработки
  managementPercent: number; // % управления от оценки разработки
  // Пороги загрузки (0..1).
  yellowThreshold: number;
  redThreshold: number;
  // Рабочих часов в году — для расчёта базовой ставки.
  workHoursPerYear: number;
}

export const DEFAULT_SPRINT_SETTINGS: SprintSettings = {
  year: 2026,
  month: 5,
  workHoursPerMonth: 168,
  reservePercent: 0.3,
  debugPercent: 0.3,
  testingPercent: 0.2,
  managementPercent: 0.1,
  yellowThreshold: 0.8,
  redThreshold: 1.0,
  workHoursPerYear: 1973,
};

export const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

// ------------------------------------------------------------------
// Helpers: подзадачи, остаток, эффективные оценки
// ------------------------------------------------------------------

// Подзадачи задачи (по parentIdReadable).
export function getSubtasks(parentIdReadable: string, list: BacklogIssue[]): BacklogIssue[] {
  return list.filter((i) => i.parentIdReadable === parentIdReadable);
}

// Эффективная оценка задачи. Для Истории это сумма оценок подзадач (если они есть в бэклоге);
// если подзадач нет — собственная estimateHours.
export function effectiveEstimate(issue: BacklogIssue, list: BacklogIssue[]): number {
  if (issue.type === 'Story') {
    const subs = getSubtasks(issue.idReadable, list);
    if (subs.length > 0) {
      return Math.round(subs.reduce((s, x) => s + x.estimateHours, 0) * 10) / 10;
    }
  }
  return issue.estimateHours;
}

// Сумма потраченных часов задачи. Для Истории — сумма по подзадачам.
export function effectiveSpent(issue: BacklogIssue, list: BacklogIssue[]): number {
  if (issue.type === 'Story') {
    const subs = getSubtasks(issue.idReadable, list);
    if (subs.length > 0) {
      return Math.round(subs.reduce((s, x) => s + (x.spentHours ?? 0), 0) * 10) / 10;
    }
  }
  return issue.spentHours ?? 0;
}

// Остаток работ к выполнению в новом периоде = оценка - уже потраченные часы.
// Не может быть отрицательным.
export function remainingEstimate(issue: BacklogIssue, list: BacklogIssue[]): number {
  const est = effectiveEstimate(issue, list);
  const spent = effectiveSpent(issue, list);
  return Math.max(0, Math.round((est - spent) * 10) / 10);
}

// Признак: задача — подзадача (её родитель присутствует в бэклоге).
export function isSubtaskOf(issue: BacklogIssue, list: BacklogIssue[]): BacklogIssue | undefined {
  if (!issue.parentIdReadable) return undefined;
  return list.find((i) => i.idReadable === issue.parentIdReadable);
}

// ------------------------------------------------------------------
// Capacity & load
// ------------------------------------------------------------------

// Доступные часы сотрудника = рабочие часы × (1 - резерв).
export function availableCapacity(settings: SprintSettings): number {
  return Math.round(settings.workHoursPerMonth * (1 - settings.reservePercent) * 10) / 10;
}

// Часы разработчика по задаче = оценка + оценка × % отладки.
export function devHoursPerIssue(estimate: number, settings: SprintSettings): number {
  return round1(estimate * (1 + settings.debugPercent));
}

// Часы тестирования по задаче = оценка × % тестирования.
export function testingHoursPerIssue(estimate: number, settings: SprintSettings): number {
  return round1(estimate * settings.testingPercent);
}

// Часы управления по задаче. По требованию: менеджер при назначении задачи на разработку
// получает время «как у разработчика» (estimate + отладка), потому что управленцы
// в этой компании тоже умеют разрабатывать.
export function managementHoursPerIssue(estimate: number, settings: SprintSettings): number {
  return round1(estimate * (1 + settings.debugPercent));
}

// Часы по задаче для конкретной плановой роли.
export function hoursPerIssueForRole(
  role: WorkRole,
  estimate: number,
  settings: SprintSettings,
): number {
  switch (role) {
    case 'development':
      return devHoursPerIssue(estimate, settings);
    case 'testing':
      return testingHoursPerIssue(estimate, settings);
    case 'management':
      return managementHoursPerIssue(estimate, settings);
    default:
      return 0;
  }
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// Считает суммарную загрузку для столбца сотрудника по конкретной роли.
export function employeeColumnHours(
  employeeId: string,
  role: WorkRole,
  assignments: Assignment[],
  backlog: BacklogIssue[],
  settings: SprintSettings,
): number {
  let h = 0;
  const idx = new Map(backlog.map((i) => [i.id, i]));
  for (const a of assignments) {
    if (a.employeeId !== employeeId || a.role !== role) continue;
    const issue = idx.get(a.issueId);
    if (!issue) continue;
    h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
  }
  return round1(h);
}

// Сумма всех плановых часов в спринте по роли (только явные назначения роли).
export function totalRoleHours(
  role: WorkRole,
  assignments: Assignment[],
  backlog: BacklogIssue[],
  settings: SprintSettings,
): number {
  const idx = new Map(backlog.map((i) => [i.id, i]));
  let h = 0;
  for (const a of assignments) {
    if (a.role !== role) continue;
    const issue = idx.get(a.issueId);
    if (!issue) continue;
    h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
  }
  return round1(h);
}

// Часы направления (тестирование/управление) для строки «по направлению».
// Включает: (1) часы по задачам, явно назначенным на исполнителей этой роли;
// (2) часы по задачам, у которых назначен только разработчик — для них
// тестирование/управление считается автоматически по % из настроек.
// Так покрываются и переходящие задачи (где разработка из прошлого месяца,
// а тестирование назначается отдельно на этот спринт).
export function directionPlannedHours(
  role: 'testing' | 'management',
  assignments: Assignment[],
  backlog: BacklogIssue[],
  settings: SprintSettings,
): number {
  const idx = new Map(backlog.map((i) => [i.id, i]));
  // Все задачи, по которым есть хотя бы одно назначение (любой роли).
  const planningIssueIds = new Set(assignments.map((a) => a.issueId));
  let h = 0;
  for (const issueId of planningIssueIds) {
    const issue = idx.get(issueId);
    if (!issue) continue;
    h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
  }
  return round1(h);
}

// Нормальная мощность направления (тестирование/управление):
// количество специалистов × доступная мощность.
export function directionCapacity(
  employees: Employee[],
  role: WorkRole,
  settings: SprintSettings,
): number {
  const count = employees.filter((e) => e.workRole === role).length;
  return round1(count * availableCapacity(settings));
}

export type LoadZone = 'empty' | 'normal' | 'yellow' | 'red';

export function loadZone(hours: number, capacity: number, settings: SprintSettings): LoadZone {
  if (hours <= 0) return 'empty';
  if (capacity <= 0) return 'red';
  const ratio = hours / capacity;
  if (ratio >= settings.redThreshold) return 'red';
  if (ratio >= settings.yellowThreshold) return 'yellow';
  return 'normal';
}
