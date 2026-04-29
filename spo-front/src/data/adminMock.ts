// Моковые данные модуля «Администрирование» — соответствуют ТЗ СПО v2:
// §17 (RBAC и оргструктура), §18 (Аудит и безопасность), §8 (Настройки/справочники/интеграции).
//
// Все строки — детерминированный мок без БД. Идентификаторы стабильны,
// чтобы UI и фильтры работали предсказуемо.

import {
  orgEmployees,
  DIRECTOR_ID,
  type EmployeeOrg,
} from "./timesheetsMock";
import { projects, systems, WORK_ROLE_LABEL_RU, type WorkRole } from "./planningMock";

// ====================== §17. Роли и права ======================

// Роли системы (RBAC). Точно по ТЗ §17.1.
export type AppRole =
  | "employee"
  | "manager"
  | "business"
  | "accountant"
  | "director"
  | "admin";

export const APP_ROLE_LABEL_RU: Record<AppRole, string> = {
  employee: "Сотрудник",
  manager: "Руководитель",
  business: "Бизнес",
  accountant: "Бухгалтер",
  director: "Директор",
  admin: "Администратор",
};

// Категории привилегий из ТЗ — для отображения матрицы прав в UI.
export interface Privilege {
  id: string;
  group: "Планирование" | "Табели" | "Финансы" | "Отчёты" | "Администрирование";
  label: string;
  // Кому по умолчанию доступна.
  defaultRoles: AppRole[];
}

export const PRIVILEGES: Privilege[] = [
  // Планирование
  { id: "planning.view", group: "Планирование", label: "Просмотр плана спринта", defaultRoles: ["employee", "manager", "business", "director", "admin"] },
  { id: "planning.edit", group: "Планирование", label: "Редактирование плана", defaultRoles: ["manager", "director"] },
  { id: "planning.lock", group: "Планирование", label: "Фиксация / снятие плана", defaultRoles: ["director"] },
  // Табели
  { id: "timesheet.view.own", group: "Табели", label: "Свой табель", defaultRoles: ["employee", "manager", "business", "accountant", "director", "admin"] },
  { id: "timesheet.view.subordinates", group: "Табели", label: "Табели подчинённых", defaultRoles: ["manager", "director"] },
  { id: "timesheet.approve.manager", group: "Табели", label: "Согласование табеля (руководитель)", defaultRoles: ["manager"] },
  { id: "timesheet.approve.director", group: "Табели", label: "Утверждение табеля (директор)", defaultRoles: ["director"] },
  // Финансы
  { id: "finance.view.own", group: "Финансы", label: "Своя ставка и история", defaultRoles: ["employee", "manager", "business", "accountant", "director", "admin"] },
  { id: "finance.view.team", group: "Финансы", label: "Ставки подчинённых", defaultRoles: ["manager", "director"] },
  { id: "finance.edit.rates", group: "Финансы", label: "Изменение ставок и ЗП", defaultRoles: ["director"] },
  { id: "finance.grade.manager", group: "Финансы", label: "Оценка руководителя в табеле", defaultRoles: ["manager"] },
  { id: "finance.grade.business", group: "Финансы", label: "Оценка бизнеса в табеле", defaultRoles: ["business"] },
  // Отчёты
  { id: "reports.personal", group: "Отчёты", label: "Личные отчёты", defaultRoles: ["employee", "manager", "business", "accountant", "director", "admin"] },
  { id: "reports.team", group: "Отчёты", label: "Отчёты по команде", defaultRoles: ["manager", "director"] },
  { id: "reports.global", group: "Отчёты", label: "Сводные отчёты по компании", defaultRoles: ["director", "accountant"] },
  { id: "period.close", group: "Отчёты", label: "Закрытие отчётного периода", defaultRoles: ["director"] },
  // Администрирование
  { id: "admin.users", group: "Администрирование", label: "Управление пользователями и ролями", defaultRoles: ["admin", "director"] },
  { id: "admin.audit", group: "Администрирование", label: "Просмотр журнала аудита", defaultRoles: ["admin", "director"] },
  { id: "admin.settings", group: "Администрирование", label: "Системные настройки и справочники", defaultRoles: ["admin"] },
  { id: "admin.integrations", group: "Администрирование", label: "Управление интеграциями", defaultRoles: ["admin"] },
];

// ====================== Учётные записи ======================

// Учётная запись пользователя СПО привязана к карточке сотрудника (employeeId).
// Несколько ролей у одного пользователя допустимы (ТЗ §17.2).
export interface AppUser {
  id: string; // u-1, u-2 ...
  employeeId: string; // привязка к карточке сотрудника
  login: string;
  email: string;
  roles: AppRole[];
  active: boolean;
  // Источник: LDAP-синхронизация или локально созданная учётка.
  source: "ldap" | "local";
  twoFactorEnabled: boolean;
  // Ограничения ABAC по проектам/системам/направлениям (ТЗ §17.3).
  // Пустой массив = без ограничений в этом измерении.
  abacProjects: string[]; // project ids
  abacSystems: string[]; // system ids
  abacRoles: WorkRole[]; // плановые направления
  createdAt: string; // ISO
  lastLoginAt?: string; // ISO
}

// Хелперы для ролей.
export function roleByEmployee(emp: EmployeeOrg): AppRole {
  if (emp.id === DIRECTOR_ID) return "director";
  if (emp.workRole === "management") return "manager";
  return "employee";
}

// Сборка списка пользователей детерминированно из оргструктуры.
function makeUsers(): AppUser[] {
  const baseDate = new Date("2025-09-01T08:00:00Z").getTime();
  return orgEmployees.map((emp, idx) => {
    const role = roleByEmployee(emp);
    // Дополнительные роли для демо.
    const roles: AppRole[] = [role];
    if (emp.id === "e-pm-2") roles.push("business");
    if (emp.id === "e-pm-3") roles.push("manager");
    const createdAt = new Date(baseDate - idx * 86_400_000 * 7).toISOString();
    const lastLoginOffset = (idx % 9) * 3600_000 * 7;
    return {
      id: `u-${idx + 1}`,
      employeeId: emp.id,
      login: emp.ytLogin,
      email: `${emp.ytLogin}@spo.local`,
      roles,
      active: idx !== 7, // одну учётку покажем как заблокированную для демо
      source: idx % 5 === 0 ? "local" : "ldap",
      twoFactorEnabled: role === "director" || idx % 4 === 0,
      abacProjects: [],
      abacSystems: [],
      abacRoles: [],
      createdAt,
      lastLoginAt:
        idx === 7
          ? undefined
          : new Date(Date.now() - 3600_000 * 2 - lastLoginOffset).toISOString(),
    };
  });
}

export const appUsers: AppUser[] = makeUsers();

export function findUserByEmployeeId(employeeId: string): AppUser | undefined {
  return appUsers.find((u) => u.employeeId === employeeId);
}

// ====================== §18. Аудит и безопасность ======================

// Доменные события, которые СПО обязан логировать (ТЗ §18.1).
export type AuditAction =
  | "user.login"
  | "user.login_failed"
  | "user.logout"
  | "user.role_changed"
  | "user.created"
  | "user.deactivated"
  | "plan.locked"
  | "plan.unlocked"
  | "timesheet.submitted"
  | "timesheet.manager_approved"
  | "timesheet.director_approved"
  | "timesheet.rejected"
  | "rate.changed"
  | "rate.deleted"
  | "period.closed"
  | "period.reopened"
  | "settings.changed"
  | "integration.sync";

export const AUDIT_ACTION_LABEL_RU: Record<AuditAction, string> = {
  "user.login": "Вход в систему",
  "user.login_failed": "Неудачная попытка входа",
  "user.logout": "Выход",
  "user.role_changed": "Изменение ролей",
  "user.created": "Создание пользователя",
  "user.deactivated": "Деактивация пользователя",
  "plan.locked": "Фиксация плана",
  "plan.unlocked": "Снятие фиксации плана",
  "timesheet.submitted": "Отправка табеля",
  "timesheet.manager_approved": "Согласование табеля руководителем",
  "timesheet.director_approved": "Утверждение табеля директором",
  "timesheet.rejected": "Отклонение табеля",
  "rate.changed": "Изменение ставки",
  "rate.deleted": "Удаление ставки",
  "period.closed": "Закрытие периода",
  "period.reopened": "Переоткрытие периода",
  "settings.changed": "Изменение настроек",
  "integration.sync": "Синхронизация с внешней системой",
};

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  at: string; // ISO
  action: AuditAction;
  severity: AuditSeverity;
  actorUserId: string; // u-...
  // Объект действия (опционально).
  entity?: { type: string; id: string; label: string };
  // IP и user-agent — для журнала входов.
  ip?: string;
  userAgent?: string;
  message: string;
}

const ACTOR_DIRECTOR = appUsers.find((u) => u.employeeId === DIRECTOR_ID)!;
const ACTOR_PM2 = appUsers.find((u) => u.employeeId === "e-pm-2")!;
const ACTOR_DEV1 = appUsers.find((u) => u.employeeId === "e-dev-1")!;
const ACTOR_QA1 = appUsers.find((u) => u.employeeId === "e-qa-1")!;
const ACTOR_BLOCKED = appUsers[7];

const HOUR = 3600_000;
const now = Date.now();
const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

export const auditEvents: AuditEvent[] = [
  {
    id: "ae-1",
    at: iso(5),
    action: "user.login",
    severity: "info",
    actorUserId: ACTOR_DIRECTOR.id,
    ip: "10.0.4.12",
    userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126",
    message: "Успешный вход директора",
  },
  {
    id: "ae-2",
    at: iso(15),
    action: "plan.locked",
    severity: "info",
    actorUserId: ACTOR_PM2.id,
    entity: { type: "sprint", id: "2026-05", label: "Май 2026" },
    message: "План спринта зафиксирован: 18 задач, 612 ч разработки",
  },
  {
    id: "ae-3",
    at: iso(42),
    action: "rate.changed",
    severity: "warning",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "employee", id: "e-dev-1", label: "Новиков С. Ю." },
    message: "ЗП изменена: 300 000 → 320 000 руб/мес",
  },
  {
    id: "ae-4",
    at: iso(78),
    action: "timesheet.director_approved",
    severity: "info",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "timesheet", id: "ts-2026-04-e-dev-2", label: "Орлова Т. М. · апрель 2026" },
    message: "Табель утверждён",
  },
  {
    id: "ae-5",
    at: iso(95),
    action: "timesheet.manager_approved",
    severity: "info",
    actorUserId: ACTOR_PM2.id,
    entity: { type: "timesheet", id: "ts-2026-04-e-dev-3", label: "Громов А. И. · апрель 2026" },
    message: "Согласовано руководителем",
  },
  {
    id: "ae-6",
    at: iso(120),
    action: "timesheet.submitted",
    severity: "info",
    actorUserId: ACTOR_DEV1.id,
    entity: { type: "timesheet", id: "ts-2026-04-e-dev-1", label: "Новиков С. Ю. · апрель 2026" },
    message: "Сотрудник отправил табель руководителю",
  },
  {
    id: "ae-7",
    at: iso(180),
    action: "user.login_failed",
    severity: "warning",
    actorUserId: ACTOR_BLOCKED.id,
    ip: "10.0.4.45",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/127",
    message: "Неверный пароль (попытка 2 из 5)",
  },
  {
    id: "ae-8",
    at: iso(240),
    action: "user.deactivated",
    severity: "critical",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "user", id: ACTOR_BLOCKED.id, label: ACTOR_BLOCKED.login },
    message: "Учётная запись заблокирована директором",
  },
  {
    id: "ae-9",
    at: iso(360),
    action: "integration.sync",
    severity: "info",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "integration", id: "youtrack", label: "YouTrack" },
    message: "Синхронизация бэклога: получено 142 задачи, конфликтов нет",
  },
  {
    id: "ae-10",
    at: iso(420),
    action: "settings.changed",
    severity: "warning",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "settings", id: "sprint", label: "Параметры спринта" },
    message: "Изменён резерв на внеплановые задачи: 25% → 30%",
  },
  {
    id: "ae-11",
    at: iso(720),
    action: "period.closed",
    severity: "warning",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "period", id: "2026-03", label: "Март 2026" },
    message: "Период закрыт. Создан snapshot отчётов.",
  },
  {
    id: "ae-12",
    at: iso(60 * 24),
    action: "user.role_changed",
    severity: "warning",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "user", id: ACTOR_PM2.id, label: ACTOR_PM2.login },
    message: "Добавлена роль «Бизнес» к учётной записи o.lebedeva",
  },
  {
    id: "ae-13",
    at: iso(60 * 26),
    action: "user.login",
    severity: "info",
    actorUserId: ACTOR_QA1.id,
    ip: "10.0.4.21",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) Safari/17",
    message: "Успешный вход",
  },
  {
    id: "ae-14",
    at: iso(60 * 28),
    action: "rate.deleted",
    severity: "warning",
    actorUserId: ACTOR_DIRECTOR.id,
    entity: { type: "employee", id: "e-dev-2", label: "Орлова Т. М." },
    message: "Удалена активная ставка, активной стала предыдущая (200 000 руб/мес)",
  },
];

// ====================== Сессии и входы ======================

export interface UserSession {
  id: string;
  userId: string;
  startedAt: string; // ISO
  lastActivityAt: string; // ISO
  ip: string;
  userAgent: string;
  // null — активная (не завершена).
  endedAt: string | null;
  // Способ завершения, если сессия закончилась.
  endReason?: "logout" | "timeout" | "revoked";
}

export const userSessions: UserSession[] = [
  {
    id: "s-1",
    userId: ACTOR_DIRECTOR.id,
    startedAt: iso(5),
    lastActivityAt: iso(1),
    ip: "10.0.4.12",
    userAgent: "Chrome 126 / Windows",
    endedAt: null,
  },
  {
    id: "s-2",
    userId: ACTOR_PM2.id,
    startedAt: iso(45),
    lastActivityAt: iso(3),
    ip: "10.0.4.18",
    userAgent: "Chrome 126 / macOS",
    endedAt: null,
  },
  {
    id: "s-3",
    userId: ACTOR_DEV1.id,
    startedAt: iso(120),
    lastActivityAt: iso(60),
    ip: "10.0.4.31",
    userAgent: "Firefox 127 / Linux",
    endedAt: iso(30),
    endReason: "logout",
  },
  {
    id: "s-4",
    userId: ACTOR_QA1.id,
    startedAt: iso(60 * 26),
    lastActivityAt: iso(60 * 24),
    ip: "10.0.4.21",
    userAgent: "Safari 17 / macOS",
    endedAt: iso(60 * 24),
    endReason: "timeout",
  },
  {
    id: "s-5",
    userId: ACTOR_BLOCKED.id,
    startedAt: iso(180),
    lastActivityAt: iso(180),
    ip: "10.0.4.45",
    userAgent: "Firefox 127 / Linux",
    endedAt: iso(178),
    endReason: "revoked",
  },
];

// ====================== Изменения чувствительных данных ======================

// Diff «было/стало» для критичных полей: ставки, роли, оргструктура (ТЗ §18.2).
export type SensitiveChangeKind =
  | "salary"
  | "rate"
  | "role"
  | "manager"
  | "permission";

export const SENSITIVE_KIND_LABEL_RU: Record<SensitiveChangeKind, string> = {
  salary: "ЗП сотрудника",
  rate: "Часовая ставка",
  role: "Роли пользователя",
  manager: "Подчинённость",
  permission: "Права доступа",
};

export interface SensitiveChange {
  id: string;
  at: string; // ISO
  actorUserId: string;
  targetEmployeeId: string;
  kind: SensitiveChangeKind;
  field: string;
  fromValue: string;
  toValue: string;
  reason?: string;
}

export const sensitiveChanges: SensitiveChange[] = [
  {
    id: "sc-1",
    at: iso(42),
    actorUserId: ACTOR_DIRECTOR.id,
    targetEmployeeId: "e-dev-1",
    kind: "salary",
    field: "ЗП на руки, руб/мес",
    fromValue: "300 000",
    toValue: "320 000",
    reason: "Ежегодный пересмотр",
  },
  {
    id: "sc-2",
    at: iso(60 * 24),
    actorUserId: ACTOR_DIRECTOR.id,
    targetEmployeeId: "e-pm-2",
    kind: "role",
    field: "Роли",
    fromValue: "Руководитель",
    toValue: "Руководитель, Бизнес",
  },
  {
    id: "sc-3",
    at: iso(60 * 28),
    actorUserId: ACTOR_DIRECTOR.id,
    targetEmployeeId: "e-dev-2",
    kind: "rate",
    field: "Активная ставка (часовая)",
    fromValue: "1 339 руб/ч",
    toValue: "1 218 руб/ч",
    reason: "Удалена ошибочно введённая запись",
  },
  {
    id: "sc-4",
    at: iso(60 * 72),
    actorUserId: ACTOR_DIRECTOR.id,
    targetEmployeeId: "e-dev-7",
    kind: "manager",
    field: "Руководитель",
    fromValue: "Лебедева О. А.",
    toValue: "Беляев С. В.",
    reason: "Перевод между командами",
  },
  {
    id: "sc-5",
    at: iso(60 * 96),
    actorUserId: ACTOR_DIRECTOR.id,
    targetEmployeeId: "e-pm-3",
    kind: "permission",
    field: "ABAC: проекты",
    fromValue: "—",
    toValue: "ERP, BNK",
    reason: "Ограничение по портфелю",
  },
];

// ====================== §8. Настройки ======================

// Интеграции с внешними системами (ТЗ §8.3).
export type IntegrationStatus = "connected" | "error" | "disconnected";

export interface IntegrationConfig {
  id: "youtrack" | "github" | "ldap" | "salary1c" | "smtp";
  name: string;
  description: string;
  status: IntegrationStatus;
  baseUrl?: string;
  // Маска секрета (показываем только последние 4 символа).
  secretMask?: string;
  lastSyncAt?: string; // ISO
  // Дополнительные поля для UI.
  notes?: string;
}

export const integrations: IntegrationConfig[] = [
  {
    id: "youtrack",
    name: "YouTrack",
    description: "Источник бэклога и worklog для табелей.",
    status: "connected",
    baseUrl: "https://youtrack.company.local",
    secretMask: "perm:••••••••a3f9",
    lastSyncAt: iso(360),
  },
  {
    id: "github",
    name: "GitHub Enterprise",
    description: "Связка проектов с репозиториями. Прямой push недоступен — только через Connectors.",
    status: "connected",
    baseUrl: "https://github.company.local",
    secretMask: "ghp_••••••••7c1d",
    lastSyncAt: iso(60 * 6),
  },
  {
    id: "ldap",
    name: "LDAP / Active Directory",
    description: "Источник учётных записей сотрудников.",
    status: "connected",
    baseUrl: "ldaps://ad.company.local:636",
    secretMask: "svc-spo / ••••••",
    lastSyncAt: iso(60 * 12),
  },
  {
    id: "salary1c",
    name: "1С: ЗУП",
    description: "Загрузка окладов и графика отпусков.",
    status: "error",
    baseUrl: "https://1c.company.local/zup",
    secretMask: "api_••••••••e221",
    lastSyncAt: iso(60 * 30),
    notes: "Ошибка авторизации при последней попытке. Проверьте срок действия токена.",
  },
  {
    id: "smtp",
    name: "Почтовый сервер (SMTP)",
    description: "Уведомления о согласовании табелей и закрытии периодов.",
    status: "connected",
    baseUrl: "smtp.company.local:587",
    secretMask: "noreply@spo.local / ••••••",
    lastSyncAt: iso(20),
  },
];

// Производственный календарь — типы дней (для расчёта мощности).
export type DayKind = "work" | "weekend" | "holiday" | "shortened";

export const DAY_KIND_LABEL_RU: Record<DayKind, string> = {
  work: "Рабочий",
  weekend: "Выходной",
  holiday: "Праздник",
  shortened: "Сокращённый",
};

// Справочники: проекты, системы, рабочие роли, типы трудозатрат.
// Проекты/системы берём из planningMock — здесь только локальные справочники.
export interface WorkTypeRef {
  id: string;
  label: string;
  description: string;
}

export const workTypes: WorkTypeRef[] = [
  { id: "wt-dev", label: "Разработка", description: "Проектирование, кодирование, ревью" },
  { id: "wt-debug", label: "Отладка", description: "Исправление дефектов по своей задаче" },
  { id: "wt-test", label: "Тестирование", description: "Функциональное и регрессионное тестирование" },
  { id: "wt-mgmt", label: "Управление", description: "Координация, статусы, согласования" },
  { id: "wt-meet", label: "Совещания", description: "Планирования, ретро, демо" },
  { id: "wt-other", label: "Прочее", description: "Внеплановые работы, обучение" },
];

// Реэкспорт справочников проекта/системы/ролей для удобства Settings.
export const referenceProjects = projects;
export const referenceSystems = systems;
export const referenceWorkRoles: { id: WorkRole; label: string }[] = (
  ["development", "testing", "management", "other"] as WorkRole[]
).map((r) => ({ id: r, label: WORK_ROLE_LABEL_RU[r] }));
