// Агрегаторы для модуля «Финансы» (ТЗ §14–16).
// Главное: сводная таблица задач спринта, по которым были трудозатраты или которые
// планировались. Группировка по Историям; самостоятельные Task/Bug без родителя — отдельно.
// Бизнес выставляет оценку по каждой Истории (или сироте-Task/Bug). Деньги — копейки.

import {
  initialTimesheets,
  CURRENT_TS_MONTH,
  CURRENT_TS_YEAR,
  orgEmployees,
  type Timesheet,
  type TimesheetStatus,
} from "@/data/timesheetsMock";
import {
  activeSalaryFor,
  baseHourlyRateKop,
  computeRowFinance,
  initialSalaryHistory,
  DEFAULT_FINANCE_SETTINGS,
  type BusinessGrade,
  type ManagerGrade,
  type SalaryRecord,
} from "@/data/salaryMock";
import {
  backlog,
  effectiveEstimate,
  effectiveSpent,
  projects,
  systems,
  type BacklogIssue,
  type IssueType,
} from "@/data/planningMock";
import { planSnapshotFor } from "@/data/planSnapshotMock";
import {
  hoursPerIssueForRole,
  DEFAULT_SPRINT_SETTINGS,
} from "@/lib/planning";

// Какие табели берём в финансовый расчёт.
// По ТЗ финансы считаются по фактическим трудозатратам периода.
// Включаем все статусы кроме «черновика» — иначе на демо-данных таблица пуста
// (демо: только часть табелей в approved/manager_approved).
const COUNTABLE_STATUSES: TimesheetStatus[] = [
  "submitted",
  "manager_approved",
  "approved",
];

export function periodTimesheets(
  year: number,
  month: number,
  approvedOnly = false,
): Timesheet[] {
  const isCurrent = year === CURRENT_TS_YEAR && month === CURRENT_TS_MONTH;
  if (!isCurrent) return [];
  const allowed: TimesheetStatus[] = approvedOnly
    ? ["approved"]
    : COUNTABLE_STATUSES;
  return initialTimesheets.filter((t) => allowed.includes(t.status));
}

// ---------- Финансовые суммы ----------

export interface FinanceTotals {
  minutes: number;
  baseSumKop: number;
  managerSumKop: number;
  businessSumKop: number;
  netTotalKop: number;
}

const ZERO_TOTALS: FinanceTotals = {
  minutes: 0,
  baseSumKop: 0,
  managerSumKop: 0,
  businessSumKop: 0,
  netTotalKop: 0,
};

function addTotals(a: FinanceTotals, b: FinanceTotals): FinanceTotals {
  return {
    minutes: a.minutes + b.minutes,
    baseSumKop: a.baseSumKop + b.baseSumKop,
    managerSumKop: a.managerSumKop + b.managerSumKop,
    businessSumKop: a.businessSumKop + b.businessSumKop,
    netTotalKop: a.netTotalKop + b.netTotalKop,
  };
}

export function effectiveRateKop(t: FinanceTotals): number {
  if (t.minutes <= 0) return 0;
  return Math.round(t.netTotalKop / (t.minutes / 60));
}

// ---------- Вклад сотрудника в задачу ----------

export interface IssueContribution {
  employeeId: string;
  employeeName: string;
  minutes: number;
  managerGrade: ManagerGrade; // оценка руководителя (по строке табеля)
  baseRateKop: number;
}

// ---------- Задача в финансовой таблице ----------

export interface IssueLine {
  // Идентификация задачи.
  idReadable: string; // ERP-201
  summary: string;
  type: IssueType;
  projectId: string;
  projectShort: string;
  systemId: string;
  systemName: string;
  // Родитель (если есть) — для tooltip контекста.
  parentIdReadable?: string;
  parentSummary?: string;
  parentType?: IssueType;
  // Кому принадлежит этот узел (для подзадач — id Истории; для top-level — собственный id).
  groupKey: string;
  // Нужно ли показывать селектор оценки бизнеса в этой строке.
  isGradable: boolean;
  // Оценка / потрачено суммарно / в текущем периоде.
  estimateHours: number;
  spentHoursPrior: number; // потрачено в прошлых периодах (effectiveSpent — на дату начала)
  minutesThisPeriod: number; // суммарно по всем сотрудникам в текущем спринте
  // Финансовые суммы (без учёта бизнес-премии — она применяется на уровне группы/строки).
  baseSumKop: number;
  managerSumKop: number;
  // Кто и сколько работал в текущем периоде по этой задаче.
  contributions: IssueContribution[];
  // Был ли задача в плане спринта (по умолчанию true, если есть строки plan-источника).
  inPlan: boolean;
  // Есть ли по задаче трудозатраты в текущем периоде.
  hasWorklog: boolean;
}

// ---------- Группа: Story либо сирота Task/Bug ----------

export interface IssueGroup {
  key: string;
  // Заголовок группы — Story или сама задача (если сирота).
  head: IssueLine;
  // Подзадачи (для Story); пусто для сирот.
  children: IssueLine[];
  // Суммарные часы по группе.
  totalMinutes: number;
  estimateHours: number;
  spentHoursPrior: number;
  // Финансовые суммы группы — база и премия руководителя (агрегаты).
  baseSumKop: number;
  managerSumKop: number;
  // ----- Оценки готовности (ТЗ §15/§16) -----
  // Оценка на начало периода (read-only, из снапшота прошлого периода).
  readinessAtStart: number; // 0..100
  // Плановая оценка на конец периода (выставляется при планировании, read-only здесь).
  readinessPlan: number; // 0..100
  // Плановые часы (development + отладка + testing + management) — берутся от
  // ОСТАТКА работ (estimate − spent), как и в Planning. Используются для плановой
  // себестоимости.
  plannedHours: number;
  // Плановая себестоимость (база × часы; без премий — это «себестоимость» труда).
  plannedCostKop: number;
}

function ensureBacklog(idReadable: string): BacklogIssue | undefined {
  return backlog.find((b) => b.idReadable === idReadable);
}

function buildLine(
  issue: BacklogIssue,
  groupKey: string,
  isGradable: boolean,
  perIssueRows: Map<
    string,
    { employeeId: string; minutes: number; managerGrade: ManagerGrade }[]
  >,
  salaryByEmp: Map<string, SalaryRecord | null>,
  inPlanSet: Set<string>,
): IssueLine {
  const proj = projects.find((p) => p.id === issue.projectId);
  const rows = perIssueRows.get(issue.idReadable) ?? [];
  let minutes = 0;
  let baseSumKop = 0;
  let managerSumKop = 0;
  const contributions: IssueContribution[] = [];

  for (const r of rows) {
    const salary = salaryByEmp.get(r.employeeId) ?? null;
    // Считаем без оценки бизнеса (она будет добавлена на уровне группы).
    const f = computeRowFinance(
      r.minutes,
      salary,
      r.managerGrade,
      "none",
      DEFAULT_FINANCE_SETTINGS,
    );
    minutes += r.minutes;
    baseSumKop += f.baseSumKop;
    managerSumKop += f.managerSumKop;
    const emp = orgEmployees.find((e) => e.id === r.employeeId);
    contributions.push({
      employeeId: r.employeeId,
      employeeName: emp?.name ?? r.employeeId,
      minutes: r.minutes,
      managerGrade: r.managerGrade,
      baseRateKop: salary ? baseHourlyRateKop(salary) : 0,
    });
  }

  const sys = systems.find((s) => s.id === issue.systemId);
  return {
    idReadable: issue.idReadable,
    summary: issue.summary,
    type: issue.type,
    projectId: issue.projectId,
    projectShort: proj?.shortName ?? "—",
    systemId: issue.systemId ?? "",
    systemName: sys?.name ?? "",
    parentIdReadable: issue.parentIdReadable,
    parentSummary: issue.parentSummary,
    parentType: issue.parentType,
    groupKey,
    isGradable,
    estimateHours: effectiveEstimate(issue),
    spentHoursPrior: effectiveSpent(issue),
    minutesThisPeriod: minutes,
    baseSumKop,
    managerSumKop,
    contributions,
    inPlan: inPlanSet.has(issue.idReadable),
    hasWorklog: minutes > 0,
  };
}

// Главный билдер: возвращает группы (Story + сироты).
export function buildSprintIssueGroups(
  year: number,
  month: number,
  approvedOnly = false,
): IssueGroup[] {
  const tss = periodTimesheets(year, month, approvedOnly);

  // 1) Накапливаем строки по issueIdReadable.
  const perIssueRows = new Map<
    string,
    { employeeId: string; minutes: number; managerGrade: ManagerGrade }[]
  >();
  const inPlanSet = new Set<string>();
  for (const ts of tss) {
    for (const r of ts.rows) {
      const arr = perIssueRows.get(r.issueIdReadable) ?? [];
      arr.push({
        employeeId: ts.employeeId,
        minutes: r.minutes,
        managerGrade: r.managerGrade,
      });
      perIssueRows.set(r.issueIdReadable, arr);
      if (r.source === "plan") inPlanSet.add(r.issueIdReadable);
    }
  }

  // 2) Кэш ставок сотрудников.
  const salaryByEmp = new Map<string, SalaryRecord | null>();
  for (const e of orgEmployees) {
    salaryByEmp.set(e.id, activeSalaryFor(initialSalaryHistory, e.id, year, month));
  }

  // 3) Все задачи, которые попадают в таблицу = задачи с трудозатратами в периоде
  //    ∪ задачи, которые были запланированы (источник plan в любой строке).
  const involvedIds = new Set<string>(perIssueRows.keys());
  // Подтягиваем родительские Истории, если есть подзадачи в involved.
  const withParents = new Set<string>(involvedIds);
  for (const id of involvedIds) {
    const issue = ensureBacklog(id);
    if (issue?.parentIdReadable) {
      const parent = ensureBacklog(issue.parentIdReadable);
      if (parent && parent.type === "Story") {
        withParents.add(parent.idReadable);
      }
    }
  }

  // 4) Раскладываем по группам.
  const emptyGroup = (key: string, head: IssueLine): IssueGroup => ({
    key,
    head,
    children: [],
    totalMinutes: 0,
    estimateHours: 0,
    spentHoursPrior: 0,
    baseSumKop: 0,
    managerSumKop: 0,
    readinessAtStart: 0,
    readinessPlan: 0,
    plannedHours: 0,
    plannedCostKop: 0,
  });

  const groupsMap = new Map<string, IssueGroup>();
  for (const id of withParents) {
    const issue = ensureBacklog(id);
    if (!issue) continue;
    if (issue.type === "Story") {
      if (!groupsMap.has(issue.idReadable)) {
        const head = buildLine(issue, issue.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
        groupsMap.set(issue.idReadable, emptyGroup(issue.idReadable, head));
      }
    } else {
      const parent = issue.parentIdReadable ? ensureBacklog(issue.parentIdReadable) : undefined;
      if (parent && parent.type === "Story") {
        if (!groupsMap.has(parent.idReadable)) {
          const head = buildLine(parent, parent.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
          groupsMap.set(parent.idReadable, emptyGroup(parent.idReadable, head));
        }
        const grp = groupsMap.get(parent.idReadable)!;
        grp.children.push(
          buildLine(issue, parent.idReadable, false, perIssueRows, salaryByEmp, inPlanSet),
        );
      } else {
        if (!groupsMap.has(issue.idReadable)) {
          const head = buildLine(issue, issue.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
          groupsMap.set(issue.idReadable, emptyGroup(issue.idReadable, head));
        }
      }
    }
  }

  // 5) Суммируем итоги группы + плановые показатели и снапшот готовности.
  // Средняя базовая ставка по сотрудникам организации — fallback, если по группе
  // нет ни одного контрибьютора (часы ещё не списаны).
  const orgAvgBaseRate = (() => {
    let s = 0;
    let n = 0;
    for (const e of orgEmployees) {
      const sal = salaryByEmp.get(e.id);
      if (sal) {
        s += baseHourlyRateKop(sal);
        n++;
      }
    }
    return n > 0 ? Math.round(s / n) : 0;
  })();

  const planSettings = DEFAULT_SPRINT_SETTINGS;
  const planHoursForIssue = (issue: BacklogIssue) => {
    const remaining = Math.max(0, effectiveEstimate(issue) - effectiveSpent(issue));
    const dev = hoursPerIssueForRole("development", remaining, planSettings);
    const tst = hoursPerIssueForRole("testing", remaining, planSettings);
    const mgmt = hoursPerIssueForRole("management", remaining, planSettings);
    return Math.round((dev + tst + mgmt) * 10) / 10;
  };

  for (const grp of groupsMap.values()) {
    const lines = grp.children.length > 0 ? grp.children : [grp.head];
    grp.totalMinutes = lines.reduce((s, c) => s + c.minutesThisPeriod, 0);
    grp.estimateHours = lines.reduce((s, c) => s + c.estimateHours, 0);
    grp.spentHoursPrior = lines.reduce((s, c) => s + c.spentHoursPrior, 0);
    grp.baseSumKop = lines.reduce((s, c) => s + c.baseSumKop, 0);
    grp.managerSumKop = lines.reduce((s, c) => s + c.managerSumKop, 0);

    // Плановые часы.
    let plannedHours = 0;
    for (const line of lines) {
      const issue = ensureBacklog(line.idReadable);
      if (issue) plannedHours += planHoursForIssue(issue);
    }
    grp.plannedHours = Math.round(plannedHours * 10) / 10;

    // Средняя базовая ставка по уже отметившимся (или fallback по организации).
    let rateSum = 0;
    let rateCount = 0;
    for (const line of lines) {
      for (const c of line.contributions) {
        if (c.baseRateKop > 0) {
          rateSum += c.baseRateKop;
          rateCount++;
        }
      }
    }
    const avgRate = rateCount > 0 ? Math.round(rateSum / rateCount) : orgAvgBaseRate;
    grp.plannedCostKop = Math.round(plannedHours * avgRate);

    // Снапшот: оценка на начало и плановая оценка готовности.
    // Для Story берём с самой Story (head). Для сирот — с неё же.
    const snap = planSnapshotFor(grp.head.idReadable);
    grp.readinessAtStart = snap?.readinessAtStart ?? 0;
    grp.readinessPlan = snap?.readinessPlan ?? 0;
  }

  // 6) Сортировка: по проекту → по id.
  return [...groupsMap.values()].sort((a, b) => {
    if (a.head.projectShort !== b.head.projectShort) {
      return a.head.projectShort.localeCompare(b.head.projectShort);
    }
    return a.head.idReadable.localeCompare(b.head.idReadable);
  });
}

// Расчёт премии бизнеса по группе при выставленной оценке.
// Премия = (минуты группы / 60) × средневзвешенная базовая ставка × процент бизнеса.
// Точнее — по контрибьюциям: ∑ (минуты_i × ставка_i × %).
export function computeBusinessSumKop(
  group: IssueGroup,
  grade: BusinessGrade,
): number {
  const pct = DEFAULT_FINANCE_SETTINGS.businessPercent[grade] ?? 0;
  if (pct <= 0) return 0;
  const lines = group.children.length > 0 ? group.children : [group.head];
  let sum = 0;
  for (const line of lines) {
    for (const c of line.contributions) {
      sum += Math.round((c.minutes / 60) * c.baseRateKop * pct);
    }
  }
  return sum;
}

export function groupNetTotal(
  group: IssueGroup,
  businessSumKop: number,
): number {
  return group.baseSumKop + group.managerSumKop + businessSumKop;
}

// ---------- Сводные показатели периода ----------

export function summarizeGroups(
  groups: IssueGroup[],
  grades: Record<string, BusinessGrade>,
): FinanceTotals {
  let acc = ZERO_TOTALS;
  for (const g of groups) {
    const grade = grades[g.key] ?? "none";
    const bSum = computeBusinessSumKop(g, grade);
    acc = addTotals(acc, {
      minutes: g.totalMinutes,
      baseSumKop: g.baseSumKop,
      managerSumKop: g.managerSumKop,
      businessSumKop: bSum,
      netTotalKop: g.baseSumKop + g.managerSumKop + bSum,
    });
  }
  return acc;
}

// Разбивка по проектам — для подсказок.
export function summarizeByProject(
  groups: IssueGroup[],
  grades: Record<string, BusinessGrade>,
): { projectId: string; projectShort: string; projectName: string; totals: FinanceTotals }[] {
  const acc = new Map<string, FinanceTotals>();
  for (const g of groups) {
    const grade = grades[g.key] ?? "none";
    const bSum = computeBusinessSumKop(g, grade);
    const t: FinanceTotals = {
      minutes: g.totalMinutes,
      baseSumKop: g.baseSumKop,
      managerSumKop: g.managerSumKop,
      businessSumKop: bSum,
      netTotalKop: g.baseSumKop + g.managerSumKop + bSum,
    };
    acc.set(g.head.projectId, addTotals(acc.get(g.head.projectId) ?? ZERO_TOTALS, t));
  }
  const out: ReturnType<typeof summarizeByProject> = [];
  for (const p of projects) {
    const totals = acc.get(p.id);
    if (!totals || totals.minutes === 0) continue;
    out.push({
      projectId: p.id,
      projectShort: p.shortName,
      projectName: p.name,
      totals,
    });
  }
  return out.sort((a, b) => b.totals.netTotalKop - a.totals.netTotalKop);
}

// Группировка по «Системам» с агрегатами по группе.
export interface SystemBucket {
  systemId: string;
  systemName: string;
  groups: IssueGroup[];
  totalMinutes: number;
  plannedCostKop: number;
  factCostKop: number;
  baseSumKop: number;
  managerSumKop: number;
  businessSumKop: number;
  // Средневзвешенные оценки готовности по группам (вес = плановые часы,
  // fallback — оценка задачи в часах; при отсутствии веса считается простое среднее).
  readinessAtStartAvg: number;
  readinessPlanAvg: number;
  readinessFactAvg: number;
}

export function groupBySystem(
  groups: IssueGroup[],
  grades: Record<string, BusinessGrade>,
  factReadiness: Record<string, number> = {},
): SystemBucket[] {
  const map = new Map<string, SystemBucket>();
  // Накапливаем числитель/знаменатель для взвешенных средних готовности.
  const w = new Map<
    string,
    { weightSum: number; startW: number; planW: number; factW: number; n: number; startSimple: number; planSimple: number; factSimple: number }
  >();
  for (const g of groups) {
    const id = g.head.systemId || "__none__";
    const name = g.head.systemName || "Нет системы";
    let bucket = map.get(id);
    if (!bucket) {
      bucket = {
        systemId: id,
        systemName: name,
        groups: [],
        totalMinutes: 0,
        plannedCostKop: 0,
        factCostKop: 0,
        baseSumKop: 0,
        managerSumKop: 0,
        businessSumKop: 0,
        readinessAtStartAvg: 0,
        readinessPlanAvg: 0,
        readinessFactAvg: 0,
      };
      map.set(id, bucket);
      w.set(id, { weightSum: 0, startW: 0, planW: 0, factW: 0, n: 0, startSimple: 0, planSimple: 0, factSimple: 0 });
    }
    const grade = grades[g.key] ?? "none";
    const bSum = computeBusinessSumKop(g, grade);
    const fact = g.baseSumKop + g.managerSumKop + bSum;
    bucket.groups.push(g);
    bucket.totalMinutes += g.totalMinutes;
    bucket.plannedCostKop += g.plannedCostKop;
    bucket.factCostKop += fact;
    bucket.baseSumKop += g.baseSumKop;
    bucket.managerSumKop += g.managerSumKop;
    bucket.businessSumKop += bSum;
    const factVal = factReadiness[g.key] ?? g.readinessPlan;
    const weight = g.plannedHours > 0 ? g.plannedHours : g.estimateHours;
    const acc = w.get(id)!;
    acc.n += 1;
    acc.startSimple += g.readinessAtStart;
    acc.planSimple += g.readinessPlan;
    acc.factSimple += factVal;
    if (weight > 0) {
      acc.weightSum += weight;
      acc.startW += g.readinessAtStart * weight;
      acc.planW += g.readinessPlan * weight;
      acc.factW += factVal * weight;
    }
  }
  for (const [id, bucket] of map.entries()) {
    const acc = w.get(id)!;
    if (acc.weightSum > 0) {
      bucket.readinessAtStartAvg = Math.round(acc.startW / acc.weightSum);
      bucket.readinessPlanAvg = Math.round(acc.planW / acc.weightSum);
      bucket.readinessFactAvg = Math.round(acc.factW / acc.weightSum);
    } else if (acc.n > 0) {
      bucket.readinessAtStartAvg = Math.round(acc.startSimple / acc.n);
      bucket.readinessPlanAvg = Math.round(acc.planSimple / acc.n);
      bucket.readinessFactAvg = Math.round(acc.factSimple / acc.n);
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.systemId === "__none__") return 1;
    if (b.systemId === "__none__") return -1;
    const ai = systems.findIndex((s) => s.id === a.systemId);
    const bi = systems.findIndex((s) => s.id === b.systemId);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

// ---------- Опции периодов ----------

const MONTHS_FULL_RU = [
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

export interface FinancePeriodOption {
  year: number;
  month: number;
  label: string;
}

export function financePeriodOptions(): FinancePeriodOption[] {
  const out: FinancePeriodOption[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(CURRENT_TS_YEAR, CURRENT_TS_MONTH - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    out.push({ year: y, month: m, label: `${MONTHS_FULL_RU[m - 1]} ${y}` });
  }
  return out;
}

export const FINANCE_MONTHS_RU = MONTHS_FULL_RU;
