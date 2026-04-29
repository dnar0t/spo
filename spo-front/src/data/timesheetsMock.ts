// Моковые данные модуля «Табели». Сотрудник видит свой табель,
// руководитель — табели подчинённых (по managerId, рекурсивно), директор — всех.
// Источники строк: (1) задачи из плана месяца (Planning); (2) задачи из YouTrack,
// в которые сотрудник списывал часы в этом месяце (worklog).
//
// Часы храним в МИНУТАХ (целое), без Float — по требованию ТЗ.

import { backlog, employees, type Employee } from "./planningMock";
import {
  DEFAULT_BUSINESS_GRADE,
  DEFAULT_MANAGER_GRADE,
  type BusinessGrade,
  type ManagerGrade,
} from "./salaryMock";

export type TimesheetStatus =
  | "draft" // Черновик — редактирует сотрудник
  | "submitted" // Отправлен руководителю
  | "manager_approved" // Согласован руководителем, ждёт директора
  | "approved" // Утверждён директором — заблокирован
  | "rejected"; // Отклонён, возвращён сотруднику

export const TIMESHEET_STATUS_LABEL_RU: Record<TimesheetStatus, string> = {
  draft: "Черновик",
  submitted: "На согласовании у руководителя",
  manager_approved: "На утверждении директором",
  approved: "Утверждён",
  rejected: "Отклонён",
};

// Иерархия подчинённости. Директор не имеет manager (null).
// Расширяем уже существующих сотрудников.
export interface EmployeeOrg extends Employee {
  managerId: string | null;
  isDirector?: boolean;
}

// Назначаем оргструктуру:
// - Директор: e-pm-1 (Морозов И. К.) — для демо.
// - PM2/PM3 подчиняются директору.
// - Все разработчики поделены между двумя PM.
// - Тестировщики подчиняются PM3 (Беляев) — отдельный QA-руководитель.
const MANAGER_MAP: Record<string, string | null> = {
  "e-pm-1": null, // директор
  "e-pm-2": "e-pm-1",
  "e-pm-3": "e-pm-1",
  // dev — поровну между pm-2 и pm-3
  "e-dev-1": "e-pm-2",
  "e-dev-2": "e-pm-2",
  "e-dev-3": "e-pm-2",
  "e-dev-4": "e-pm-2",
  "e-dev-5": "e-pm-2",
  "e-dev-6": "e-pm-2",
  "e-dev-7": "e-pm-3",
  "e-dev-8": "e-pm-3",
  "e-dev-9": "e-pm-3",
  "e-dev-10": "e-pm-3",
  "e-dev-11": "e-pm-3",
  "e-dev-12": "e-pm-3",
  // qa — под pm-3
  "e-qa-1": "e-pm-3",
  "e-qa-2": "e-pm-3",
  "e-qa-3": "e-pm-3",
};

export const orgEmployees: EmployeeOrg[] = employees.map((e) => ({
  ...e,
  managerId: MANAGER_MAP[e.id] ?? null,
  isDirector: MANAGER_MAP[e.id] === null,
}));

export const DIRECTOR_ID = "e-pm-1";

// Возвращает прямых и косвенных подчинённых сотрудника.
export function getSubordinates(managerId: string): EmployeeOrg[] {
  const result: EmployeeOrg[] = [];
  const stack: string[] = [managerId];
  const seen = new Set<string>([managerId]);
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of orgEmployees) {
      if (e.managerId === cur && !seen.has(e.id)) {
        seen.add(e.id);
        result.push(e);
        stack.push(e.id);
      }
    }
  }
  return result;
}

// Видимые сотрудники для текущего пользователя (включая его самого).
export function visibleEmployeesFor(viewerId: string): EmployeeOrg[] {
  const viewer = orgEmployees.find((e) => e.id === viewerId);
  if (!viewer) return [];
  return [viewer, ...getSubordinates(viewerId)];
}

// ---------- Табели ----------

export type RowSource = "plan" | "worklog";

// Строка табеля = одна задача + сумма часов сотрудника за месяц по этой задаче.
export interface TimesheetRow {
  id: string;
  issueIdReadable: string; // например, ERP-201
  source: RowSource; // plan — из плана месяца; worklog — из YouTrack worklog
  minutes: number; // целое, в минутах
  comment?: string;
  // Оценки руководителя/бизнеса по строке (ТЗ §14.5).
  // Пока оценка не выставлена — суммы в финансовых колонках = 0 (ТЗ §14.5).
  managerGrade: ManagerGrade;
  businessGrade: BusinessGrade;
}

// История изменений значимых полей строки табеля (часы, оценки и т. п.).
export interface TimesheetRowChange {
  at: string;
  actorId: string;
  rowId: string;
  field: "minutes" | "managerGrade" | "businessGrade";
  fromValue: string;
  toValue: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  year: number;
  month: number; // 1..12
  status: TimesheetStatus;
  rows: TimesheetRow[];
  // История переходов статусов для аудита.
  history: {
    at: string; // ISO
    actorId: string;
    fromStatus: TimesheetStatus | null;
    toStatus: TimesheetStatus;
    comment?: string;
  }[];
  // История изменений строк (часы, оценки и т. п.) — для аудита и отображения «было/стало».
  rowChanges: TimesheetRowChange[];
}

export const HOURS_TO_MIN = 60;
export const minutesToHoursStr = (min: number): string => {
  const h = min / 60;
  if (Number.isInteger(h)) return String(h);
  return (Math.round(h * 10) / 10).toString().replace(".", ",");
};
export const parseHoursToMinutes = (input: string): number => {
  const v = input.trim().replace(",", ".");
  if (v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 60);
};

// Для каждого сотрудника собираем список «плановых» задач (issueIdReadable),
// которые попали в план текущего месяца. В моках просто берём первые задачи
// из бэклога — этого достаточно для демонстрации.
function planIssuesForEmployee(employeeId: string): string[] {
  // Простое распределение: каждому свой набор задач.
  const all = backlog.map((b) => b.idReadable);
  const seed = employees.findIndex((e) => e.id === employeeId);
  if (seed < 0) return [];
  const start = (seed * 2) % all.length;
  return [all[start], all[(start + 1) % all.length], all[(start + 3) % all.length]];
}

// Для разнообразия — пара worklog-задач, которых нет в плане сотрудника.
function worklogIssuesForEmployee(employeeId: string): string[] {
  const all = backlog.map((b) => b.idReadable);
  const seed = employees.findIndex((e) => e.id === employeeId);
  if (seed < 0) return [];
  return [all[(seed * 3 + 5) % all.length]];
}

// Псевдо-распределение часов по сотруднику: сумма ≈ 168 ч. в утверждённых,
// меньше — в черновиках, для демонстрации.
function generateRows(
  employeeId: string,
  totalHoursTarget: number,
  status: TimesheetStatus,
): TimesheetRow[] {
  const planIds = planIssuesForEmployee(employeeId);
  const worklogIds = worklogIssuesForEmployee(employeeId).filter(
    (id) => !planIds.includes(id),
  );
  const planParts = [0.45, 0.3, 0.15]; // в сумме 0.9
  const worklogParts = worklogIds.length ? [0.1] : [];
  const rows: TimesheetRow[] = [];
  // Оценки: в черновике/отклонённом — none; на согласовании — none (руководитель ещё не выставил);
  // согласован руководителем — выставлены оценки руководителя; утверждён — все оценки выставлены.
  const mGrade: ManagerGrade =
    status === "manager_approved" || status === "approved" ? DEFAULT_MANAGER_GRADE : "none";
  const bGrade: BusinessGrade = status === "approved" ? DEFAULT_BUSINESS_GRADE : "none";
  planIds.forEach((idR, i) => {
    const min = Math.round(totalHoursTarget * 60 * (planParts[i] ?? 0));
    rows.push({
      id: `${employeeId}-p-${idR}`,
      issueIdReadable: idR,
      source: "plan",
      minutes: min,
      managerGrade: mGrade,
      businessGrade: bGrade,
    });
  });
  worklogIds.forEach((idR, i) => {
    const min = Math.round(totalHoursTarget * 60 * (worklogParts[i] ?? 0));
    rows.push({
      id: `${employeeId}-w-${idR}`,
      issueIdReadable: idR,
      source: "worklog",
      minutes: min,
      managerGrade: mGrade,
      businessGrade: bGrade,
    });
  });
  return rows;
}

// Текущий месяц для демо — апрель 2026 (соответствует «текущей дате» проекта).
export const CURRENT_TS_YEAR = 2026;
export const CURRENT_TS_MONTH = 4;

// Предсозданные табели на текущий месяц для всех сотрудников, в разных статусах.
function statusFor(idx: number): TimesheetStatus {
  const cycle: TimesheetStatus[] = [
    "draft",
    "submitted",
    "manager_approved",
    "approved",
    "rejected",
    "draft",
    "submitted",
  ];
  return cycle[idx % cycle.length];
}

function targetHoursFor(status: TimesheetStatus): number {
  switch (status) {
    case "approved":
    case "manager_approved":
      return 168;
    case "submitted":
      return 160;
    case "rejected":
      return 152;
    case "draft":
    default:
      return 96;
  }
}

export const initialTimesheets: Timesheet[] = orgEmployees.map((e, idx) => {
  const status = statusFor(idx);
  const target = targetHoursFor(status);
  return {
    id: `ts-${e.id}-${CURRENT_TS_YEAR}-${CURRENT_TS_MONTH}`,
    employeeId: e.id,
    year: CURRENT_TS_YEAR,
    month: CURRENT_TS_MONTH,
    status,
    rows: generateRows(e.id, target, status),
    rowChanges: [],
    history: [
      {
        at: new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1, 1).toISOString(),
        actorId: e.id,
        fromStatus: null,
        toStatus: "draft",
      },
      ...(status !== "draft"
        ? [
            {
              at: new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1, 25).toISOString(),
              actorId: e.id,
              fromStatus: "draft" as TimesheetStatus,
              toStatus: "submitted" as TimesheetStatus,
            },
          ]
        : []),
      ...(status === "manager_approved" || status === "approved"
        ? [
            {
              at: new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1, 27).toISOString(),
              actorId: orgEmployees.find((x) => x.id === e.managerId)?.id ?? DIRECTOR_ID,
              fromStatus: "submitted" as TimesheetStatus,
              toStatus: "manager_approved" as TimesheetStatus,
            },
          ]
        : []),
      ...(status === "approved"
        ? [
            {
              at: new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1, 28).toISOString(),
              actorId: DIRECTOR_ID,
              fromStatus: "manager_approved" as TimesheetStatus,
              toStatus: "approved" as TimesheetStatus,
            },
          ]
        : []),
      ...(status === "rejected"
        ? [
            {
              at: new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1, 26).toISOString(),
              actorId: orgEmployees.find((x) => x.id === e.managerId)?.id ?? DIRECTOR_ID,
              fromStatus: "submitted" as TimesheetStatus,
              toStatus: "rejected" as TimesheetStatus,
              comment: "Уточните распределение часов по задаче " + (generateRows(e.id, target, status)[0]?.issueIdReadable ?? ""),
            },
          ]
        : []),
    ],
  };
});

export function totalMinutes(ts: Timesheet): number {
  return ts.rows.reduce((s, r) => s + r.minutes, 0);
}
export function totalHours(ts: Timesheet): number {
  return Math.round((totalMinutes(ts) / 60) * 10) / 10;
}

// Доступные действия в зависимости от роли просмотрщика и статуса табеля.
export type ViewerRole = "self" | "manager" | "director";

export interface ActionFlags {
  canEdit: boolean;
  canSubmit: boolean;
  canManagerApprove: boolean;
  canDirectorApprove: boolean;
  canReject: boolean;
  canRecall: boolean; // отозвать на доработку
}

export function actionsFor(viewer: ViewerRole, status: TimesheetStatus): ActionFlags {
  const f: ActionFlags = {
    canEdit: false,
    canSubmit: false,
    canManagerApprove: false,
    canDirectorApprove: false,
    canReject: false,
    canRecall: false,
  };
  if (viewer === "self") {
    if (status === "draft" || status === "rejected") {
      f.canEdit = true;
      f.canSubmit = true;
    }
    if (status === "submitted") {
      f.canRecall = true;
    }
  } else if (viewer === "manager") {
    if (status === "submitted") {
      f.canEdit = true; // руководитель может скорректировать перед согласованием
      f.canManagerApprove = true;
      f.canReject = true;
    }
  } else if (viewer === "director") {
    if (status === "manager_approved") {
      f.canEdit = true;
      f.canDirectorApprove = true;
      f.canReject = true;
    }
    // Директор тоже видит как руководитель — может согласовать за PM в случае эскалации.
    if (status === "submitted") {
      f.canManagerApprove = true;
      f.canReject = true;
    }
  }
  return f;
}
