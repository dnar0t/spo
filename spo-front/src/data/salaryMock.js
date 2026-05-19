"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialSalaryHistory = exports.DEFAULT_BUSINESS_GRADE = exports.DEFAULT_MANAGER_GRADE = exports.DEFAULT_FINANCE_SETTINGS = exports.BUSINESS_GRADE_LABEL = exports.MANAGER_GRADE_LABEL = exports.KOPECKS_PER_RUB = void 0;
exports.activeSalaryFor = activeSalaryFor;
exports.baseHourlyRateKop = baseHourlyRateKop;
exports.computeRowFinance = computeRowFinance;
exports.formatRub = formatRub;
exports.formatRubInt = formatRubInt;
exports.formatPct = formatPct;
const planningMock_1 = require("./planningMock");
exports.KOPECKS_PER_RUB = 100;
exports.MANAGER_GRADE_LABEL = {
    none: "Не выставлена",
    satisfactory: "Удовлетворительно",
    good: "Хорошо",
    excellent: "Отлично",
};
exports.BUSINESS_GRADE_LABEL = {
    none: "Не выставлена",
    no_benefit: "Нет выгоды",
    direct: "Прямая выгода",
    obvious: "Польза очевидна",
};
exports.DEFAULT_FINANCE_SETTINGS = {
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
exports.DEFAULT_MANAGER_GRADE = "good";
exports.DEFAULT_BUSINESS_GRADE = "direct";
const SALARY_HISTORY_RAW = [];
for (const e of planningMock_1.employees) {
    SALARY_HISTORY_RAW.push({
        empId: e.id,
        from: "2024-01-01",
        net: Math.round(e.monthlyNetSalary * 0.88),
        comment: "Начальная ставка 2024",
    });
    SALARY_HISTORY_RAW.push({
        empId: e.id,
        from: "2025-01-01",
        net: Math.round(e.monthlyNetSalary * 0.95),
        comment: "Индексация 2025",
    });
    SALARY_HISTORY_RAW.push({
        empId: e.id,
        from: "2026-01-01",
        net: e.monthlyNetSalary,
        comment: "Пересмотр на 2026",
    });
}
exports.initialSalaryHistory = SALARY_HISTORY_RAW.map((r, i) => ({
    id: `sal-${r.empId}-${r.from}`,
    employeeId: r.empId,
    effectiveFrom: r.from,
    monthlyNetKop: r.net * exports.KOPECKS_PER_RUB,
    workHoursPerYear: exports.DEFAULT_FINANCE_SETTINGS.workHoursPerYear,
    createdBy: "e-pm-1",
    createdAt: new Date(r.from + "T09:00:00Z").toISOString(),
    comment: r.comment,
}));
function activeSalaryFor(history, employeeId, year, month) {
    const cutoff = new Date(year, month, 0).toISOString().slice(0, 10);
    const candidates = history
        .filter((s) => s.employeeId === employeeId && s.effectiveFrom <= cutoff)
        .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
    return candidates[0] ?? null;
}
function baseHourlyRateKop(rec) {
    const yearly = rec.monthlyNetKop * 12;
    return Math.round(yearly / rec.workHoursPerYear);
}
function computeRowFinance(minutes, salary, managerGrade, businessGrade, settings) {
    const baseRate = salary ? baseHourlyRateKop(salary) : 0;
    const hoursTimes100 = minutes / 60;
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
function formatRub(kop, opts = {}) {
    const rub = kop / 100;
    if (opts.compact && Math.abs(rub) >= 1000) {
        return `${(rub / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс ₽`;
    }
    return rub.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";
}
function formatRubInt(kop) {
    return Math.round(kop / 100).toLocaleString("ru-RU") + " ₽";
}
function formatPct(p) {
    return `${Math.round(p * 100)}%`;
}
//# sourceMappingURL=salaryMock.js.map