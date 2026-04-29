// Зарплаты, ставки и финансовые настройки расчёта (ТЗ §14, §15, §16).
//
// Хранение:
// - Деньги — в КОПЕЙКАХ (целое), без Float.
// - Ставка часовая — тоже в копейках/час.
// - История ставок: версии с датой начала действия. На месяц расчёта берётся
//   та запись, у которой effectiveFrom <= последний день месяца, и нет более
//   свежей с датой начала ≤ конца месяца.

import { employees } from "./planningMock";

export const KOPECKS_PER_RUB = 100;

// ---------- Финансовые настройки (ТЗ §14.4) ----------

// Оценка руководителя (премиальная часть, % от Часы × Базовая ставка).
export type ManagerGrade = "none" | "satisfactory" | "good" | "excellent";
export const MANAGER_GRADE_LABEL: Record<ManagerGrade, string> = {
  none: "Не выставлена",
  satisfactory: "Удовлетворительно",
  good: "Хорошо",
  excellent: "Отлично",
};

// Оценка бизнеса. «none» — оценка не выставлена (премия не считается, в селекторе
// плейсхолдер). «no_benefit» — пользователь явно выставил «Нет выгоды» (0%).
export type BusinessGrade =
  | "none"
  | "no_benefit"
  | "direct"
  | "obvious";
export const BUSINESS_GRADE_LABEL: Record<BusinessGrade, string> = {
  none: "Не выставлена",
  no_benefit: "Нет выгоды",
  direct: "Прямая выгода",
  obvious: "Польза очевидна",
};

export interface FinanceSettings {
  // Рабочих часов в году (единое значение, ТЗ §14.1).
  workHoursPerYear: number;
  // Базовый процент (ТЗ §14.5).
  basePercent: number; // 0..1
  managerPercent: Record<ManagerGrade, number>;
  businessPercent: Record<BusinessGrade, number>;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  workHoursPerYear: 1973,
  basePercent: 0.7,
  managerPercent: {
    none: 0,
    satisfactory: 0.1,
    good: 0.2,
    excellent: 0.3,
  },
  businessPercent: {
    none: 0,
    no_benefit: 0,
    direct: 0.1,
    obvious: 0.2,
  },
};

// Дефолты по ТЗ §15.2 (для плановой себестоимости и черновиков табеля).
export const DEFAULT_MANAGER_GRADE: ManagerGrade = "good"; // Хорошо
export const DEFAULT_BUSINESS_GRADE: BusinessGrade = "direct"; // Прямая выгода

// ---------- История ставок сотрудника (ТЗ §14.2) ----------

export interface SalaryRecord {
  id: string;
  employeeId: string;
  effectiveFrom: string; // YYYY-MM-DD
  monthlyNetKop: number; // ЗП на руки в месяц, копейки
  workHoursPerYear: number; // фиксируется на момент расчёта
  createdBy: string; // employeeId автора изменения
  createdAt: string; // ISO
  comment?: string;
}

// Сгенерируем «историю» для каждого сотрудника: 1–2 записи (повышение в начале года).
const SALARY_HISTORY_RAW: { empId: string; from: string; net: number; comment?: string }[] = [];
for (const e of employees) {
  // Стартовая ставка с прошлого года (на 10–15% ниже текущей).
  SALARY_HISTORY_RAW.push({
    empId: e.id,
    from: "2024-01-01",
    net: Math.round(e.monthlyNetSalary * 0.88),
    comment: "Начальная ставка 2024",
  });
  // Индексация в январе 2025.
  SALARY_HISTORY_RAW.push({
    empId: e.id,
    from: "2025-01-01",
    net: Math.round(e.monthlyNetSalary * 0.95),
    comment: "Индексация 2025",
  });
  // Текущий контракт — с 2026-01-01.
  SALARY_HISTORY_RAW.push({
    empId: e.id,
    from: "2026-01-01",
    net: e.monthlyNetSalary,
    comment: "Пересмотр на 2026",
  });
}

export const initialSalaryHistory: SalaryRecord[] = SALARY_HISTORY_RAW.map((r, i) => ({
  id: `sal-${r.empId}-${r.from}`,
  employeeId: r.empId,
  effectiveFrom: r.from,
  monthlyNetKop: r.net * KOPECKS_PER_RUB,
  workHoursPerYear: DEFAULT_FINANCE_SETTINGS.workHoursPerYear,
  createdBy: "e-pm-1", // директор
  createdAt: new Date(r.from + "T09:00:00Z").toISOString(),
  comment: r.comment,
}));

// Действующая запись по сотруднику на конец указанного месяца.
export function activeSalaryFor(
  history: SalaryRecord[],
  employeeId: string,
  year: number,
  month: number, // 1..12
): SalaryRecord | null {
  const cutoff = new Date(year, month, 0).toISOString().slice(0, 10); // последний день месяца
  const candidates = history
    .filter((s) => s.employeeId === employeeId && s.effectiveFrom <= cutoff)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  return candidates[0] ?? null;
}

// ---------- Расчёты (ТЗ §14.5–14.7) ----------

// Базовая часовая ставка: ЗП-в-год / часов-в-году. В копейках/час (округление до коп.).
export function baseHourlyRateKop(rec: SalaryRecord): number {
  const yearly = rec.monthlyNetKop * 12;
  return Math.round(yearly / rec.workHoursPerYear);
}

export interface RowFinance {
  baseRateKop: number; // ставка часа, коп/час
  baseSumKop: number; // Сумма базовая
  managerSumKop: number; // Сумма от руководителя
  businessSumKop: number; // Сумма от бизнеса
  netTotalKop: number; // Итого на руки
  effectiveRateKop: number; // Эффективная ставка (на час)
  managerPct: number; // 0..1 — фактически применённый %
  businessPct: number;
}

export function computeRowFinance(
  minutes: number,
  salary: SalaryRecord | null,
  managerGrade: ManagerGrade,
  businessGrade: BusinessGrade,
  settings: FinanceSettings,
): RowFinance {
  const baseRate = salary ? baseHourlyRateKop(salary) : 0;
  const hoursTimes100 = minutes / 60; // float для расчёта, итог округляем до копейки
  const mPct = settings.managerPercent[managerGrade] ?? 0;
  const bPct = settings.businessPercent[businessGrade] ?? 0;
  const baseSum = Math.round(hoursTimes100 * baseRate * settings.basePercent);
  const mSum = Math.round(hoursTimes100 * baseRate * mPct);
  const bSum = Math.round(hoursTimes100 * baseRate * bPct);
  const total = baseSum + mSum + bSum;
  const eff = minutes > 0 ? Math.round(total / (minutes / 60)) : 0;
  return {
    baseRateKop: baseRate,
    baseSumKop: baseSum,
    managerSumKop: mSum,
    businessSumKop: bSum,
    netTotalKop: total,
    effectiveRateKop: eff,
    managerPct: mPct,
    businessPct: bPct,
  };
}

// ---------- Форматирование ----------

export function formatRub(kop: number, opts: { compact?: boolean } = {}): string {
  const rub = kop / 100;
  if (opts.compact && Math.abs(rub) >= 1000) {
    return `${(rub / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс ₽`;
  }
  return rub.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
}

export function formatRubInt(kop: number): string {
  return Math.round(kop / 100).toLocaleString("ru-RU") + " ₽";
}

export function formatPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}
