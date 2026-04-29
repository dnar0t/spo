// Моковые данные модуля «Планирование» — соответствует ТЗ СПО v2.
// Спринт = календарный месяц. Бэклог из YouTrack (мок), сотрудники с рабочей ролью.

export type WorkRole = "development" | "testing" | "management" | "other";
export type Priority = "Blocker" | "High" | "Medium" | "Low";
export type IssueType = "Epic" | "Feature" | "Story" | "Task" | "Bug";
export type IssueState =
  | "Open"
  | "In Progress"
  | "In Review"
  | "Testing"
  | "Done"
  | "Reopened";

export interface Project {
  id: string;
  shortName: string; // как в YouTrack (например, ERP)
  name: string;
}

export interface SystemRef {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  workRole: WorkRole;
  monthlyNetSalary: number; // ЗП на руки в месяц, руб
  ytLogin: string;
}

// Задача из бэклога YouTrack (для планирования показываем не выше уровня "История").
export interface BacklogIssue {
  id: string; // внутренний
  idReadable: string; // ERP-123
  summary: string;
  projectId: string;
  systemId: string;
  type: IssueType;
  priority: Priority;
  state: IssueState;
  reporterId: string; // employee id
  // Оценка задачи в часах (из YouTrack — поле «Оценка», в минутах -> часы).
  estimateHours: number;
  // Готовность из предыдущего месяца (0..100). Для новых = 0.
  readiness: number;
  // Часы, уже потраченные в предыдущих отчётных периодах (трудозатраты из табелей).
  // Для новых задач = 0. Используется для расчёта остатка работ:
  // остаток = max(0, оценка - потрачено).
  spentHours?: number;
  // Иерархия: ссылка на родительскую историю/фичу (для tooltip-контекста).
  parentIdReadable?: string;
  parentSummary?: string;
  parentType?: IssueType;
  // Текущий исполнитель в YT (если кто-то уже поставлен).
  assigneeId?: string;
}

// Назначение задачи на сотрудника в рамках месячного спринта.
// Одна задача может иметь до 3 назначений: по одному на каждую плановую роль
// (разработка / тестирование / управление). В пределах одной роли — один сотрудник.
export interface Assignment {
  issueId: string;
  employeeId: string;
  role: WorkRole; // development | testing | management
}

export const projects: Project[] = [
  { id: "p-erp", shortName: "ERP", name: "Внедрение ERP «Север»" },
  { id: "p-bnk", shortName: "BNK", name: "Биллинг для банка" },
  { id: "p-gov", shortName: "GOV", name: "Портал гос. услуг" },
  { id: "p-rtl", shortName: "RTL", name: "Loyalty 2.0" },
];

export const systems: SystemRef[] = [
  { id: "s-core", name: "Core" },
  { id: "s-billing", name: "Биллинг" },
  { id: "s-portal", name: "Портал" },
  { id: "s-integ", name: "Интеграции" },
  { id: "s-reports", name: "Отчётность" },
];

export const employees: Employee[] = [
  // Разработчики
  { id: "e-dev-1", name: "Новиков С. Ю.", position: "Senior Developer", workRole: "development", monthlyNetSalary: 320000, ytLogin: "s.novikov" },
  { id: "e-dev-2", name: "Орлова Т. М.", position: "Developer", workRole: "development", monthlyNetSalary: 220000, ytLogin: "t.orlova" },
  { id: "e-dev-3", name: "Громов А. И.", position: "Developer", workRole: "development", monthlyNetSalary: 210000, ytLogin: "a.gromov" },
  { id: "e-dev-4", name: "Петров К. Л.", position: "Junior Developer", workRole: "development", monthlyNetSalary: 140000, ytLogin: "k.petrov" },
  // Тестировщики (на отдельный столбец «Тестирование»)
  { id: "e-qa-1", name: "Иванов А. С.", position: "Тест-лид", workRole: "testing", monthlyNetSalary: 240000, ytLogin: "a.ivanov" },
  { id: "e-qa-2", name: "Петрова М. И.", position: "QA Engineer", workRole: "testing", monthlyNetSalary: 180000, ytLogin: "m.petrova" },
  // Менеджеры (на столбец «Управление»)
  { id: "e-pm-1", name: "Морозов И. К.", position: "Project Manager", workRole: "management", monthlyNetSalary: 260000, ytLogin: "i.morozov" },
  { id: "e-pm-2", name: "Лебедева О. А.", position: "Project Manager", workRole: "management", monthlyNetSalary: 240000, ytLogin: "o.lebedeva" },
  // Доп. разработчики (для проверки масштабирования таблицы)
  { id: "e-dev-5", name: "Соколов В. П.", position: "Senior Developer", workRole: "development", monthlyNetSalary: 310000, ytLogin: "v.sokolov" },
  { id: "e-dev-6", name: "Кузнецова Е. Д.", position: "Developer", workRole: "development", monthlyNetSalary: 215000, ytLogin: "e.kuznetsova" },
  { id: "e-dev-7", name: "Васильев Д. О.", position: "Developer", workRole: "development", monthlyNetSalary: 205000, ytLogin: "d.vasilev" },
  { id: "e-dev-8", name: "Михайлова Н. С.", position: "Junior Developer", workRole: "development", monthlyNetSalary: 145000, ytLogin: "n.mikhaylova" },
  { id: "e-dev-9", name: "Зайцев Р. А.", position: "Senior Developer", workRole: "development", monthlyNetSalary: 305000, ytLogin: "r.zaytsev" },
  { id: "e-dev-10", name: "Павлов И. Е.", position: "Developer", workRole: "development", monthlyNetSalary: 225000, ytLogin: "i.pavlov" },
  { id: "e-dev-11", name: "Семёнов А. В.", position: "Developer", workRole: "development", monthlyNetSalary: 218000, ytLogin: "a.semenov" },
  { id: "e-dev-12", name: "Голубева Л. М.", position: "Junior Developer", workRole: "development", monthlyNetSalary: 138000, ytLogin: "l.golubeva" },
  // Доп. тестировщик и менеджер
  { id: "e-qa-3", name: "Фёдоров П. Н.", position: "QA Engineer", workRole: "testing", monthlyNetSalary: 175000, ytLogin: "p.fedorov" },
  { id: "e-pm-3", name: "Беляев С. В.", position: "Project Manager", workRole: "management", monthlyNetSalary: 250000, ytLogin: "s.belyaev" },
];

// Бэклог. Истории могут содержать подзадачи (Task/Bug).
// Для Историй поле estimateHours игнорируется визуально — отображается сумма подзадач.
// helpers ниже рассчитывают это автоматически.
export const backlog: BacklogIssue[] = [
  {
    id: "i1",
    idReadable: "ERP-201",
    summary: "Регистрация входящих документов: маршрутизация по подразделениям",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Story",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 24,
    readiness: 0,
    parentIdReadable: "ERP-100",
    parentSummary: "Электронный документооборот",
    parentType: "Feature",
  },
  {
    id: "i1-s1",
    idReadable: "ERP-202",
    summary: "Форма регистрации входящего документа",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Task",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 10,
    readiness: 0,
    parentIdReadable: "ERP-201",
    parentSummary: "Регистрация входящих документов: маршрутизация по подразделениям",
    parentType: "Story",
  },
  {
    id: "i1-s2",
    idReadable: "ERP-203",
    summary: "Маршрутизация по подразделениям: настройка правил",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Task",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 14,
    readiness: 0,
    parentIdReadable: "ERP-201",
    parentSummary: "Регистрация входящих документов: маршрутизация по подразделениям",
    parentType: "Story",
  },
  {
    id: "i2",
    idReadable: "ERP-204",
    summary: "Согласование договоров: визы и параллельные ветки",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Story",
    priority: "Medium",
    state: "In Progress",
    reporterId: "e-pm-1",
    estimateHours: 32,
    readiness: 35,
    spentHours: 11,
    parentIdReadable: "ERP-100",
    parentSummary: "Электронный документооборот",
    parentType: "Feature",
    assigneeId: "e-dev-1",
  },
  {
    id: "i3",
    idReadable: "ERP-318",
    summary: "Импорт справочника контрагентов из 1С",
    projectId: "p-erp",
    systemId: "s-integ",
    type: "Task",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 12,
    readiness: 0,
  },
  {
    id: "i4",
    idReadable: "ERP-412",
    summary: "Ошибка: некорректный пересчёт остатков при сторнировании",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Bug",
    priority: "Blocker",
    state: "Reopened",
    reporterId: "e-pm-1",
    estimateHours: 8,
    readiness: 0,
  },
  {
    id: "i5",
    idReadable: "BNK-87",
    summary: "Профиль клиента: история операций с пагинацией",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Story",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 20,
    readiness: 0,
    parentIdReadable: "BNK-50",
    parentSummary: "Личный кабинет клиента",
    parentType: "Epic",
  },
  {
    id: "i5-s1",
    idReadable: "BNK-88",
    summary: "API истории операций с пагинацией",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Task",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 12,
    readiness: 0,
    parentIdReadable: "BNK-87",
    parentSummary: "Профиль клиента: история операций с пагинацией",
    parentType: "Story",
  },
  {
    id: "i5-s2",
    idReadable: "BNK-89",
    summary: "Ошибка: дублирование строк при пагинации",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Bug",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 6,
    readiness: 0,
    parentIdReadable: "BNK-87",
    parentSummary: "Профиль клиента: история операций с пагинацией",
    parentType: "Story",
  },
  {
    id: "i5-s3",
    idReadable: "BNK-90",
    summary: "UI: фильтры и сортировка истории",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Task",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 8,
    readiness: 0,
    parentIdReadable: "BNK-87",
    parentSummary: "Профиль клиента: история операций с пагинацией",
    parentType: "Story",
  },
  {
    id: "i6",
    idReadable: "BNK-92",
    summary: "Нагрузочное тестирование биллинг-конвейера",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Task",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 16,
    readiness: 0,
  },
  {
    id: "i7",
    idReadable: "BNK-101",
    summary: "Расчёт комиссий: вынести правила в конфигурацию",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Story",
    priority: "Medium",
    state: "In Progress",
    reporterId: "e-pm-2",
    estimateHours: 28,
    readiness: 60,
    spentHours: 17,
    assigneeId: "e-dev-2",
  },
  {
    id: "i8",
    idReadable: "BNK-115",
    summary: "Ошибка: дубль транзакции при ретрае платежа",
    projectId: "p-bnk",
    systemId: "s-billing",
    type: "Bug",
    priority: "Blocker",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 10,
    readiness: 0,
  },
  {
    id: "i9",
    idReadable: "GOV-23",
    summary: "Подача заявления на субсидию: форма и валидация",
    projectId: "p-gov",
    systemId: "s-portal",
    type: "Story",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 22,
    readiness: 0,
  },
  {
    id: "i10",
    idReadable: "GOV-31",
    summary: "Интеграция с СМЭВ: запросы к ФНС",
    projectId: "p-gov",
    systemId: "s-integ",
    type: "Story",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 30,
    readiness: 0,
    parentIdReadable: "GOV-10",
    parentSummary: "Межведомственное взаимодействие",
    parentType: "Epic",
  },
  {
    id: "i11",
    idReadable: "GOV-45",
    summary: "Личный кабинет заявителя: уведомления о статусе",
    projectId: "p-gov",
    systemId: "s-portal",
    type: "Story",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 18,
    readiness: 0,
  },
  {
    id: "i12",
    idReadable: "RTL-14",
    summary: "Кэшбэк-движок: правила начисления",
    projectId: "p-rtl",
    systemId: "s-core",
    type: "Story",
    priority: "High",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 26,
    readiness: 0,
  },
  {
    id: "i13",
    idReadable: "RTL-22",
    summary: "Экспорт отчёта по программам лояльности в Excel",
    projectId: "p-rtl",
    systemId: "s-reports",
    type: "Task",
    priority: "Low",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 8,
    readiness: 0,
  },
  {
    id: "i14",
    idReadable: "RTL-28",
    summary: "Сегментация клиентов: фильтры и сохранение наборов",
    projectId: "p-rtl",
    systemId: "s-reports",
    type: "Story",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-2",
    estimateHours: 20,
    readiness: 0,
  },
  {
    id: "i15",
    idReadable: "ERP-520",
    summary: "Аудит действий пользователя: журнал и фильтры",
    projectId: "p-erp",
    systemId: "s-reports",
    type: "Story",
    priority: "Low",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 14,
    readiness: 0,
  },
  {
    id: "i16",
    idReadable: "ERP-527",
    summary: "Ошибка: неверная сортировка в реестре договоров",
    projectId: "p-erp",
    systemId: "s-core",
    type: "Bug",
    priority: "Medium",
    state: "Open",
    reporterId: "e-pm-1",
    estimateHours: 4,
    readiness: 0,
  },
];

export const ISSUE_STATES: IssueState[] = [
  "Open",
  "In Progress",
  "In Review",
  "Testing",
  "Done",
  "Reopened",
];

export const ISSUE_TYPES: IssueType[] = ["Epic", "Feature", "Story", "Task", "Bug"];
export const PRIORITIES: Priority[] = ["Blocker", "High", "Medium", "Low"];

export const PRIORITY_LABEL_RU: Record<Priority, string> = {
  Blocker: "Блокер",
  High: "Высокий",
  Medium: "Средний",
  Low: "Низкий",
};

export const TYPE_LABEL_RU: Record<IssueType, string> = {
  Epic: "Эпик",
  Feature: "Фича",
  Story: "История",
  Task: "Задача",
  Bug: "Ошибка",
};

export const STATE_LABEL_RU: Record<IssueState, string> = {
  Open: "Открыта",
  "In Progress": "В работе",
  "In Review": "На ревью",
  Testing: "Тестируется",
  Done: "Готово",
  Reopened: "Переоткрыта",
};

export const WORK_ROLE_LABEL_RU: Record<WorkRole, string> = {
  development: "Разработка",
  testing: "Тестирование",
  management: "Управление",
  other: "Другое",
};

// Базовый URL YouTrack для построения ссылок (мок).
export const YT_BASE_URL = "https://youtrack.company.local";

export function ytIssueUrl(idReadable: string): string {
  return `${YT_BASE_URL}/issue/${idReadable}`;
}

// Базовая часовая ставка сотрудника (для расчётов в подсказках/себестоимости).
// Годовой доход / рабочих часов в году. Часы в году берём из настроек спринта.
export function baseHourlyRate(emp: Employee, workHoursPerYear: number): number {
  if (workHoursPerYear <= 0) return 0;
  return (emp.monthlyNetSalary * 12) / workHoursPerYear;
}

// Подзадачи задачи (по parentIdReadable).
export function getSubtasks(parentIdReadable: string, list: BacklogIssue[] = backlog): BacklogIssue[] {
  return list.filter((i) => i.parentIdReadable === parentIdReadable);
}

// Эффективная оценка задачи. Для Истории это сумма оценок подзадач (если они есть в бэклоге);
// если подзадач нет — собственная estimateHours.
export function effectiveEstimate(issue: BacklogIssue, list: BacklogIssue[] = backlog): number {
  if (issue.type === "Story") {
    const subs = getSubtasks(issue.idReadable, list);
    if (subs.length > 0) {
      return Math.round(subs.reduce((s, x) => s + x.estimateHours, 0) * 10) / 10;
    }
  }
  return issue.estimateHours;
}

// Сумма потраченных часов задачи. Для Истории — сумма по подзадачам.
export function effectiveSpent(issue: BacklogIssue, list: BacklogIssue[] = backlog): number {
  if (issue.type === "Story") {
    const subs = getSubtasks(issue.idReadable, list);
    if (subs.length > 0) {
      return Math.round(subs.reduce((s, x) => s + (x.spentHours ?? 0), 0) * 10) / 10;
    }
  }
  return issue.spentHours ?? 0;
}

// Остаток работ к выполнению в новом периоде = оценка - уже потраченные часы.
// Не может быть отрицательным.
export function remainingEstimate(issue: BacklogIssue, list: BacklogIssue[] = backlog): number {
  const est = effectiveEstimate(issue, list);
  const spent = effectiveSpent(issue, list);
  return Math.max(0, Math.round((est - spent) * 10) / 10);
}

// Признак: задача — подзадача (её родитель присутствует в бэклоге).
export function isSubtaskOf(issue: BacklogIssue, list: BacklogIssue[] = backlog): BacklogIssue | undefined {
  if (!issue.parentIdReadable) return undefined;
  return list.find((i) => i.idReadable === issue.parentIdReadable);
}

