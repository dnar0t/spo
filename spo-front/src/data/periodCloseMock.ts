// Моковые данные модуля «Закрытие периода» (ТЗ §11).
// Закрытие = контролируемая фиксация месяца с созданием immutable snapshot.
// Условия закрытия: план зафиксирован, все табели утверждены, оценки проставлены,
// финансовых расхождений нет. После закрытия редактирование заблокировано.

import {
  initialTimesheets,
  CURRENT_TS_MONTH,
  CURRENT_TS_YEAR,
  totalMinutes,
  orgEmployees,
  DIRECTOR_ID,
  type Timesheet,
  type TimesheetStatus,
} from "./timesheetsMock";
import { activeSalaryFor, baseHourlyRateKop, initialSalaryHistory } from "./salaryMock";

export type PeriodStatus = "open" | "ready" | "closed";

export const PERIOD_STATUS_LABEL_RU: Record<PeriodStatus, string> = {
  open: "Открыт",
  ready: "Готов к закрытию",
  closed: "Закрыт",
};

// Snapshot — неизменяемый слепок отчётного периода (ТЗ §11.3).
export interface PeriodSnapshot {
  id: string; // snap-2026-03
  year: number;
  month: number;
  closedAt: string; // ISO
  closedByEmployeeId: string;
  // Итоги.
  employeesCount: number;
  totalMinutes: number;
  totalPayrollKopecks: number;
  // Хеш — для отображения, что snapshot immutable.
  contentHash: string;
  // История переоткрытий (если были).
  reopens: {
    at: string;
    actorEmployeeId: string;
    reason: string;
    reclosedAt?: string;
  }[];
}

// Базовая часовая ставка (в копейках) на момент периода.
function rateKopForEmployee(employeeId: string, year: number, month: number): number {
  const rec = activeSalaryFor(initialSalaryHistory, employeeId, year, month);
  return rec ? baseHourlyRateKop(rec) : 0;
}

export function payrollForTimesheet(ts: Timesheet): number {
  const rateKop = rateKopForEmployee(ts.employeeId, ts.year, ts.month);
  // ставка за минуту = ставка за час / 60. Считаем целочисленно в копейках.
  const min = totalMinutes(ts);
  return Math.round((rateKop * min) / 60);
}

// История закрытых периодов: январь–март 2026 — закрыты, февраль с переоткрытием.
export const closedSnapshots: PeriodSnapshot[] = [
  {
    id: "snap-2026-01",
    year: 2026,
    month: 1,
    closedAt: "2026-02-05T14:30:00.000Z",
    closedByEmployeeId: DIRECTOR_ID,
    employeesCount: orgEmployees.length,
    totalMinutes: orgEmployees.length * 168 * 60,
    totalPayrollKopecks: orgEmployees.reduce(
      (s, e) => s + rateKopForEmployee(e.id, 2026, 1) * 168,
      0,
    ),
    contentHash: "sha256:a91f…3b07",
    reopens: [],
  },
  {
    id: "snap-2026-02",
    year: 2026,
    month: 2,
    closedAt: "2026-03-04T11:15:00.000Z",
    closedByEmployeeId: DIRECTOR_ID,
    employeesCount: orgEmployees.length,
    totalMinutes: orgEmployees.length * 160 * 60,
    totalPayrollKopecks: orgEmployees.reduce(
      (s, e) => s + rateKopForEmployee(e.id, 2026, 2) * 160,
      0,
    ),
    contentHash: "sha256:7c2e…ff19",
    reopens: [
      {
        at: "2026-03-12T09:40:00.000Z",
        actorEmployeeId: DIRECTOR_ID,
        reason: "Корректировка ставки e-dev-1 после получения данных из 1С: ЗУП.",
        reclosedAt: "2026-03-13T17:05:00.000Z",
      },
    ],
  },
  {
    id: "snap-2026-03",
    year: 2026,
    month: 3,
    closedAt: "2026-04-04T16:00:00.000Z",
    closedByEmployeeId: DIRECTOR_ID,
    employeesCount: orgEmployees.length,
    totalMinutes: orgEmployees.length * 168 * 60,
    totalPayrollKopecks: orgEmployees.reduce(
      (s, e) => s + rateKopForEmployee(e.id, 2026, 3) * 168,
      0,
    ),
    contentHash: "sha256:b550…91a4",
    reopens: [],
  },
];

export function findSnapshot(year: number, month: number): PeriodSnapshot | undefined {
  return closedSnapshots.find((s) => s.year === year && s.month === month);
}

// ---------- Чек-лист готовности ----------

export type ChecklistItemStatus = "ok" | "warn" | "fail";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: ChecklistItemStatus;
  detail?: string;
  // Кол-во проблемных сущностей (для бейджа).
  problemCount?: number;
  // Какие сотрудники не прошли проверку (для подсветки в таблице).
  problemEmployeeIds?: string[];
  // Блокирующее ли требование.
  blocking: boolean;
}

export interface PeriodReadiness {
  year: number;
  month: number;
  status: PeriodStatus;
  items: ChecklistItem[];
  totalEmployees: number;
  byStatus: Record<TimesheetStatus, number>;
  totalMinutes: number;
  totalPayrollKopecks: number;
  // Сотрудники без табеля (если есть).
  missingTimesheetEmployeeIds: string[];
}

export function evaluateReadiness(year: number, month: number): PeriodReadiness {
  // Если период уже закрыт — берём данные из snapshot.
  const snap = findSnapshot(year, month);
  const isCurrent = year === CURRENT_TS_YEAR && month === CURRENT_TS_MONTH;

  // Для закрытых периодов — синтетический «всё ОК».
  if (snap) {
    const allOk: ChecklistItem[] = [
      {
        id: "plan-locked",
        label: "План спринта зафиксирован",
        description: "План спринта переведён в статус «Зафиксирован» директором.",
        status: "ok",
        detail: "Зафиксирован до закрытия периода.",
        blocking: true,
      },
      {
        id: "ts-submitted",
        label: "Все табели отправлены",
        description: "Каждый сотрудник перевёл свой табель в статус «На согласовании».",
        status: "ok",
        blocking: true,
      },
      {
        id: "ts-manager-approved",
        label: "Все табели согласованы руководителями",
        description: "Прямые руководители согласовали табели подчинённых.",
        status: "ok",
        blocking: true,
      },
      {
        id: "ts-director-approved",
        label: "Все табели утверждены директором",
        description: "Директор утвердил все табели по компании.",
        status: "ok",
        blocking: true,
      },
      {
        id: "no-rejected",
        label: "Нет отклонённых табелей",
        description: "Отсутствуют табели в статусе «Отклонён».",
        status: "ok",
        blocking: true,
      },
      {
        id: "grades-set",
        label: "Оценки руководителя и бизнеса проставлены",
        description: "По всем строкам утверждённых табелей выставлены оценки.",
        status: "ok",
        blocking: true,
      },
      {
        id: "no-finance-discrepancy",
        label: "Финансовых расхождений нет",
        description: "Базовые ставки на дату периода найдены для всех сотрудников.",
        status: "ok",
        blocking: true,
      },
    ];
    return {
      year,
      month,
      status: "closed",
      items: allOk,
      totalEmployees: snap.employeesCount,
      byStatus: {
        draft: 0,
        submitted: 0,
        manager_approved: 0,
        approved: snap.employeesCount,
        rejected: 0,
      },
      totalMinutes: snap.totalMinutes,
      totalPayrollKopecks: snap.totalPayrollKopecks,
      missingTimesheetEmployeeIds: [],
    };
  }

  // Для открытого/готового периода — реальные расчёты по initialTimesheets.
  const periodTimesheets = isCurrent
    ? initialTimesheets
    : []; // другие открытые периоды — пусто (демо).

  const totalEmployees = orgEmployees.length;
  const byStatus: Record<TimesheetStatus, number> = {
    draft: 0,
    submitted: 0,
    manager_approved: 0,
    approved: 0,
    rejected: 0,
  };
  for (const ts of periodTimesheets) byStatus[ts.status] += 1;

  const missing = orgEmployees
    .filter((e) => !periodTimesheets.find((t) => t.employeeId === e.id))
    .map((e) => e.id);

  // 1. План зафиксирован — для текущего месяца предположим, что да.
  const planLocked: ChecklistItem = {
    id: "plan-locked",
    label: "План спринта зафиксирован",
    description: "План спринта должен быть в статусе «Зафиксирован» к моменту закрытия.",
    status: "ok",
    detail: "План на этот месяц зафиксирован 28-го числа предыдущего месяца.",
    blocking: true,
  };

  // 2. Все табели отправлены (т. е. не draft и не отсутствуют).
  const notSent = [
    ...periodTimesheets.filter((t) => t.status === "draft").map((t) => t.employeeId),
    ...missing,
  ];
  const tsSubmitted: ChecklistItem = {
    id: "ts-submitted",
    label: "Все табели отправлены",
    description: "Каждый сотрудник переводит свой табель в статус «На согласовании».",
    status: notSent.length === 0 ? "ok" : "fail",
    detail:
      notSent.length === 0
        ? "Отправили все сотрудники."
        : `Не отправили: ${notSent.length}.`,
    problemCount: notSent.length,
    problemEmployeeIds: notSent,
    blocking: true,
  };

  // 3. Согласованы руководителями (статус ≥ manager_approved или approved).
  const notManagerApproved = periodTimesheets
    .filter((t) => t.status === "submitted" || t.status === "draft" || t.status === "rejected")
    .map((t) => t.employeeId);
  const tsMgrApproved: ChecklistItem = {
    id: "ts-manager-approved",
    label: "Все табели согласованы руководителями",
    description: "Прямые руководители согласовывают табели своих подчинённых.",
    status: notManagerApproved.length === 0 ? "ok" : "fail",
    detail:
      notManagerApproved.length === 0
        ? "Все согласованы."
        : `Ожидают согласования: ${notManagerApproved.length}.`,
    problemCount: notManagerApproved.length,
    problemEmployeeIds: notManagerApproved,
    blocking: true,
  };

  // 4. Утверждены директором.
  const notDirectorApproved = periodTimesheets
    .filter((t) => t.status !== "approved")
    .map((t) => t.employeeId);
  const tsDirApproved: ChecklistItem = {
    id: "ts-director-approved",
    label: "Все табели утверждены директором",
    description: "Финальное утверждение директором переводит табель в неизменяемое состояние.",
    status: notDirectorApproved.length === 0 ? "ok" : "fail",
    detail:
      notDirectorApproved.length === 0
        ? "Все утверждены."
        : `Не утверждены: ${notDirectorApproved.length}.`,
    problemCount: notDirectorApproved.length,
    problemEmployeeIds: notDirectorApproved,
    blocking: true,
  };

  // 5. Нет отклонённых.
  const rejected = periodTimesheets.filter((t) => t.status === "rejected").map((t) => t.employeeId);
  const noRejected: ChecklistItem = {
    id: "no-rejected",
    label: "Нет отклонённых табелей",
    description: "Отклонённые табели должны быть переотправлены и согласованы заново.",
    status: rejected.length === 0 ? "ok" : "fail",
    detail:
      rejected.length === 0
        ? "Отклонённых нет."
        : `Отклонено: ${rejected.length}. Требуется доработка.`,
    problemCount: rejected.length,
    problemEmployeeIds: rejected,
    blocking: true,
  };

  // 6. Оценки проставлены — для табелей в статусе approved все строки имеют managerGrade ≠ none и businessGrade ≠ none.
  const missingGradesIds = periodTimesheets
    .filter((t) =>
      t.rows.some(
        (r) => r.managerGrade === "none" || r.businessGrade === "none",
      ),
    )
    .map((t) => t.employeeId);
  const gradesSet: ChecklistItem = {
    id: "grades-set",
    label: "Оценки руководителя и бизнеса проставлены",
    description: "По всем строкам должны быть выставлены оценки качества (ТЗ §14.5).",
    status: missingGradesIds.length === 0 ? "ok" : "warn",
    detail:
      missingGradesIds.length === 0
        ? "Все оценки проставлены."
        : `Без оценок: ${missingGradesIds.length}. Будут учтены с нулевыми коэффициентами.`,
    problemCount: missingGradesIds.length,
    problemEmployeeIds: missingGradesIds,
    blocking: false,
  };

  // 7. Финансовые расхождения — нет ставки на дату периода.
  const noRateIds = orgEmployees
    .filter((e) => rateKopForEmployee(e.id, year, month) === 0)
    .map((e) => e.id);
  const finOk: ChecklistItem = {
    id: "no-finance-discrepancy",
    label: "Финансовых расхождений нет",
    description: "Для каждого сотрудника есть активная базовая ставка на 1-е число периода.",
    status: noRateIds.length === 0 ? "ok" : "fail",
    detail:
      noRateIds.length === 0
        ? "Базовые ставки найдены для всех сотрудников."
        : `Без активной ставки: ${noRateIds.length}.`,
    problemCount: noRateIds.length,
    problemEmployeeIds: noRateIds,
    blocking: true,
  };

  const items = [planLocked, tsSubmitted, tsMgrApproved, tsDirApproved, noRejected, gradesSet, finOk];
  const blockers = items.filter((i) => i.blocking && i.status === "fail");
  const status: PeriodStatus = blockers.length === 0 ? "ready" : "open";

  const totalMin = periodTimesheets.reduce((s, t) => s + totalMinutes(t), 0);
  const totalPayroll = periodTimesheets.reduce((s, t) => s + payrollForTimesheet(t), 0);

  return {
    year,
    month,
    status,
    items,
    totalEmployees,
    byStatus,
    totalMinutes: totalMin,
    totalPayrollKopecks: totalPayroll,
    missingTimesheetEmployeeIds: missing,
  };
}

// Перечень периодов для селектора (последние 6 месяцев, включая текущий).
export interface PeriodOption {
  year: number;
  month: number;
  label: string;
  status: PeriodStatus;
}

const MONTH_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function buildPeriodOptions(): PeriodOption[] {
  const options: PeriodOption[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const snap = findSnapshot(y, m);
    const status: PeriodStatus = snap
      ? "closed"
      : y === CURRENT_TS_YEAR && m === CURRENT_TS_MONTH
        ? evaluateReadiness(y, m).status
        : "open";
    options.push({
      year: y,
      month: m,
      label: `${MONTH_RU[m - 1]} ${y}`,
      status,
    });
  }
  return options;
}

export const MONTHS_FULL_RU = MONTH_RU;
