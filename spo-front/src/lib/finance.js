"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMESHEET_STATUS_LABEL_RU = exports.FINANCE_MONTHS_RU = exports.KOPECKS_PER_RUB = exports.DEFAULT_FINANCE_SETTINGS = exports.MANAGER_GRADE_LABEL = exports.BUSINESS_GRADE_LABEL = exports.orgEmployees = exports.initialSalaryHistory = exports.initialTimesheets = exports.CURRENT_TS_MONTH = exports.CURRENT_TS_YEAR = void 0;
exports.activeSalaryFor = activeSalaryFor;
exports.baseHourlyRateKop = baseHourlyRateKop;
exports.computeRowFinance = computeRowFinance;
exports.formatRub = formatRub;
exports.formatRubInt = formatRubInt;
exports.formatPct = formatPct;
exports.minutesToHoursStr = minutesToHoursStr;
exports.totalMinutes = totalMinutes;
exports.totalHours = totalHours;
exports.periodTimesheets = periodTimesheets;
exports.effectiveRateKop = effectiveRateKop;
exports.buildSprintIssueGroups = buildSprintIssueGroups;
exports.computeBusinessSumKop = computeBusinessSumKop;
exports.groupNetTotal = groupNetTotal;
exports.summarizeGroups = summarizeGroups;
exports.summarizeByProject = summarizeByProject;
exports.groupBySystem = groupBySystem;
exports.parseHoursToMinutes = parseHoursToMinutes;
const planning_1 = require("@/lib/planning");
exports.CURRENT_TS_YEAR = 2026;
exports.CURRENT_TS_MONTH = 4;
exports.initialTimesheets = [];
exports.initialSalaryHistory = [];
exports.orgEmployees = [];
exports.BUSINESS_GRADE_LABEL = {
    no_benefit: 'Нет выгоды',
    direct: 'Прямая',
    obvious: 'Очевидная',
};
exports.MANAGER_GRADE_LABEL = {
    senior: 'Сеньор',
    middle: 'Мидл',
    junior: 'Джуниор',
};
exports.DEFAULT_FINANCE_SETTINGS = {
    businessGrade: 'obvious',
    managerGrade: 'middle',
    businessPercent: { no_benefit: 0, direct: 0.05, obvious: 0.1 },
};
exports.KOPECKS_PER_RUB = 100;
const MONTHS_FULL_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Округ', 'Ноябрь', 'Декабрь',
];
exports.FINANCE_MONTHS_RU = MONTHS_FULL_RU;
function activeSalaryFor(employeeId, date) {
    return undefined;
}
function baseHourlyRateKop(salary) {
    return Math.round(salary / (planning_1.DEFAULT_SPRINT_SETTINGS?.workHoursPerYear ?? 1920) * exports.KOPECKS_PER_RUB);
}
function computeRowFinance(minutes, salaryRecord, managerGrade, businessGrade) {
    return { baseSumKop: 0, managerSumKop: 0, businessSumKop: 0, netTotalKop: 0 };
}
function formatRub(kopecks) {
    const rub = Math.floor(kopecks / exports.KOPECKS_PER_RUB);
    const kop = kopecks % exports.KOPECKS_PER_RUB;
    return `${rub.toLocaleString('ru-RU')} \u20BD ${kop.toString().padStart(2, '0')} \u043A\u043E\u043F.`;
}
function formatRubInt(kopecks) {
    const rub = Math.round(kopecks / exports.KOPECKS_PER_RUB);
    return `${rub.toLocaleString('ru-RU')} \u20BD`;
}
function formatPct(value) {
    return `${(value / 100).toFixed(1)}%`;
}
function minutesToHoursStr(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}\u0447 ${m}\u043C` : `${h}\u0447`;
}
exports.TIMESHEET_STATUS_LABEL_RU = {
    draft: 'Черновик',
    submitted: 'Отправлен',
    manager_approved: 'Утверждён руководителем',
    approved: 'Утверждён',
    rejected: 'Отклонён',
};
function totalMinutes(items) {
    return items.reduce((sum, i) => sum + (i.durationMinutes || 0), 0);
}
function totalHours(items) {
    return minutesToHoursStr(totalMinutes(items));
}
const backlog = [];
const projects = [];
const systems = [];
function periodTimesheets(year, month, approvedOnly = false) {
    const isCurrent = year === exports.CURRENT_TS_YEAR && month === exports.CURRENT_TS_MONTH;
    if (!isCurrent)
        return [];
    const allowed = approvedOnly
        ? ["approved"]
        : COUNTABLE_STATUSES;
    return exports.initialTimesheets.filter((t) => allowed.includes(t.status));
}
const ZERO_TOTALS = {
    minutes: 0,
    baseSumKop: 0,
    managerSumKop: 0,
    businessSumKop: 0,
    netTotalKop: 0,
};
function addTotals(a, b) {
    return {
        minutes: a.minutes + b.minutes,
        baseSumKop: a.baseSumKop + b.baseSumKop,
        managerSumKop: a.managerSumKop + b.managerSumKop,
        businessSumKop: a.businessSumKop + b.businessSumKop,
        netTotalKop: a.netTotalKop + b.netTotalKop,
    };
}
function effectiveRateKop(t) {
    if (t.minutes <= 0)
        return 0;
    return Math.round(t.netTotalKop / (t.minutes / 60));
}
function ensureBacklog(idReadable) {
    return backlog.find((b) => b.idReadable === idReadable);
}
function buildLine(issue, groupKey, isGradable, perIssueRows, salaryByEmp, inPlanSet) {
    const proj = projects.find((p) => p.id === issue.projectId);
    const rows = perIssueRows.get(issue.idReadable) ?? [];
    let minutes = 0;
    let baseSumKop = 0;
    let managerSumKop = 0;
    const contributions = [];
    for (const r of rows) {
        const salary = salaryByEmp.get(r.employeeId) ?? null;
        const f = computeRowFinance(r.minutes, salary, r.managerGrade, "none", exports.DEFAULT_FINANCE_SETTINGS);
        minutes += r.minutes;
        baseSumKop += f.baseSumKop;
        managerSumKop += f.managerSumKop;
        const emp = exports.orgEmployees.find((e) => e.id === r.employeeId);
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
function buildSprintIssueGroups(year, month, approvedOnly = false) {
    const tss = periodTimesheets(year, month, approvedOnly);
    const perIssueRows = new Map();
    const inPlanSet = new Set();
    for (const ts of tss) {
        for (const r of ts.rows) {
            const arr = perIssueRows.get(r.issueIdReadable) ?? [];
            arr.push({
                employeeId: ts.employeeId,
                minutes: r.minutes,
                managerGrade: r.managerGrade,
            });
            perIssueRows.set(r.issueIdReadable, arr);
            if (r.source === "plan")
                inPlanSet.add(r.issueIdReadable);
        }
    }
    const salaryByEmp = new Map();
    for (const e of exports.orgEmployees) {
        salaryByEmp.set(e.id, activeSalaryFor(exports.initialSalaryHistory, e.id, year, month));
    }
    const involvedIds = new Set(perIssueRows.keys());
    const withParents = new Set(involvedIds);
    for (const id of involvedIds) {
        const issue = ensureBacklog(id);
        if (issue?.parentIdReadable) {
            const parent = ensureBacklog(issue.parentIdReadable);
            if (parent && parent.type === "Story") {
                withParents.add(parent.idReadable);
            }
        }
    }
    const emptyGroup = (key, head) => ({
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
    const groupsMap = new Map();
    for (const id of withParents) {
        const issue = ensureBacklog(id);
        if (!issue)
            continue;
        if (issue.type === "Story") {
            if (!groupsMap.has(issue.idReadable)) {
                const head = buildLine(issue, issue.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
                groupsMap.set(issue.idReadable, emptyGroup(issue.idReadable, head));
            }
        }
        else {
            const parent = issue.parentIdReadable ? ensureBacklog(issue.parentIdReadable) : undefined;
            if (parent && parent.type === "Story") {
                if (!groupsMap.has(parent.idReadable)) {
                    const head = buildLine(parent, parent.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
                    groupsMap.set(parent.idReadable, emptyGroup(parent.idReadable, head));
                }
                const grp = groupsMap.get(parent.idReadable);
                grp.children.push(buildLine(issue, parent.idReadable, false, perIssueRows, salaryByEmp, inPlanSet));
            }
            else {
                if (!groupsMap.has(issue.idReadable)) {
                    const head = buildLine(issue, issue.idReadable, true, perIssueRows, salaryByEmp, inPlanSet);
                    groupsMap.set(issue.idReadable, emptyGroup(issue.idReadable, head));
                }
            }
        }
    }
    const orgAvgBaseRate = (() => {
        let s = 0;
        let n = 0;
        for (const e of exports.orgEmployees) {
            const sal = salaryByEmp.get(e.id);
            if (sal) {
                s += baseHourlyRateKop(sal);
                n++;
            }
        }
        return n > 0 ? Math.round(s / n) : 0;
    })();
    const planSettings = planning_1.DEFAULT_SPRINT_SETTINGS;
    const planHoursForIssue = (issue) => {
        const remaining = Math.max(0, effectiveEstimate(issue) - effectiveSpent(issue));
        const dev = (0, planning_1.hoursPerIssueForRole)("development", remaining, planSettings);
        const tst = (0, planning_1.hoursPerIssueForRole)("testing", remaining, planSettings);
        const mgmt = (0, planning_1.hoursPerIssueForRole)("management", remaining, planSettings);
        return Math.round((dev + tst + mgmt) * 10) / 10;
    };
    for (const grp of groupsMap.values()) {
        const lines = grp.children.length > 0 ? grp.children : [grp.head];
        grp.totalMinutes = lines.reduce((s, c) => s + c.minutesThisPeriod, 0);
        grp.estimateHours = lines.reduce((s, c) => s + c.estimateHours, 0);
        grp.spentHoursPrior = lines.reduce((s, c) => s + c.spentHoursPrior, 0);
        grp.baseSumKop = lines.reduce((s, c) => s + c.baseSumKop, 0);
        grp.managerSumKop = lines.reduce((s, c) => s + c.managerSumKop, 0);
        let plannedHours = 0;
        for (const line of lines) {
            const issue = ensureBacklog(line.idReadable);
            if (issue)
                plannedHours += planHoursForIssue(issue);
        }
        grp.plannedHours = Math.round(plannedHours * 10) / 10;
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
        const snap = planSnapshotFor(grp.head.idReadable);
        grp.readinessAtStart = snap?.readinessAtStart ?? 0;
        grp.readinessPlan = snap?.readinessPlan ?? 0;
    }
    return [...groupsMap.values()].sort((a, b) => {
        if (a.head.projectShort !== b.head.projectShort) {
            return a.head.projectShort.localeCompare(b.head.projectShort);
        }
        return a.head.idReadable.localeCompare(b.head.idReadable);
    });
}
function computeBusinessSumKop(group, grade) {
    const pct = exports.DEFAULT_FINANCE_SETTINGS.businessPercent[grade] ?? 0;
    if (pct <= 0)
        return 0;
    const lines = group.children.length > 0 ? group.children : [group.head];
    let sum = 0;
    for (const line of lines) {
        for (const c of line.contributions) {
            sum += Math.round((c.minutes / 60) * c.baseRateKop * pct);
        }
    }
    return sum;
}
function groupNetTotal(group, businessSumKop) {
    return group.baseSumKop + group.managerSumKop + businessSumKop;
}
function summarizeGroups(groups, grades) {
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
function summarizeByProject(groups, grades) {
    const acc = new Map();
    for (const g of groups) {
        const grade = grades[g.key] ?? "none";
        const bSum = computeBusinessSumKop(g, grade);
        const t = {
            minutes: g.totalMinutes,
            baseSumKop: g.baseSumKop,
            managerSumKop: g.managerSumKop,
            businessSumKop: bSum,
            netTotalKop: g.baseSumKop + g.managerSumKop + bSum,
        };
        acc.set(g.head.projectId, addTotals(acc.get(g.head.projectId) ?? ZERO_TOTALS, t));
    }
    const out = [];
    for (const p of projects) {
        const totals = acc.get(p.id);
        if (!totals || totals.minutes === 0)
            continue;
        out.push({
            projectId: p.id,
            projectShort: p.shortName,
            projectName: p.name,
            totals,
        });
    }
    return out.sort((a, b) => b.totals.netTotalKop - a.totals.netTotalKop);
}
function groupBySystem(groups, grades, factReadiness = {}) {
    const map = new Map();
    const w = new Map();
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
        const acc = w.get(id);
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
        const acc = w.get(id);
        if (acc.weightSum > 0) {
            bucket.readinessAtStartAvg = Math.round(acc.startW / acc.weightSum);
            bucket.readinessPlanAvg = Math.round(acc.planW / acc.weightSum);
            bucket.readinessFactAvg = Math.round(acc.factW / acc.weightSum);
        }
        else if (acc.n > 0) {
            bucket.readinessAtStartAvg = Math.round(acc.startSimple / acc.n);
            bucket.readinessPlanAvg = Math.round(acc.planSimple / acc.n);
            bucket.readinessFactAvg = Math.round(acc.factSimple / acc.n);
        }
    }
    return [...map.values()].sort((a, b) => {
        if (a.systemId === "__none__")
            return 1;
        if (b.systemId === "__none__")
            return -1;
        const ai = systems.findIndex((s) => s.id === a.systemId);
        const bi = systems.findIndex((s) => s.id === b.systemId);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}
function parseHoursToMinutes(hoursStr) {
    const h = parseFloat(hoursStr.replace(",", "."));
    return isNaN(h) ? 0 : Math.round(h * 60);
}
//# sourceMappingURL=finance.js.map