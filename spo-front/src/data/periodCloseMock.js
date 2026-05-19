"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTHS_FULL_RU = exports.closedSnapshots = exports.PERIOD_STATUS_LABEL_RU = void 0;
exports.payrollForTimesheet = payrollForTimesheet;
exports.findSnapshot = findSnapshot;
exports.evaluateReadiness = evaluateReadiness;
exports.buildPeriodOptions = buildPeriodOptions;
const timesheetsMock_1 = require("./timesheetsMock");
const salaryMock_1 = require("./salaryMock");
exports.PERIOD_STATUS_LABEL_RU = {
    open: "Открыт",
    ready: "Готов к закрытию",
    closed: "Закрыт",
};
function rateKopForEmployee(employeeId, year, month) {
    const rec = (0, salaryMock_1.activeSalaryFor)(salaryMock_1.initialSalaryHistory, employeeId, year, month);
    return rec ? (0, salaryMock_1.baseHourlyRateKop)(rec) : 0;
}
function payrollForTimesheet(ts) {
    const rateKop = rateKopForEmployee(ts.employeeId, ts.year, ts.month);
    const min = (0, timesheetsMock_1.totalMinutes)(ts);
    return Math.round((rateKop * min) / 60);
}
exports.closedSnapshots = [
    {
        id: "snap-2026-01",
        year: 2026,
        month: 1,
        closedAt: "2026-02-05T14:30:00.000Z",
        closedByEmployeeId: timesheetsMock_1.DIRECTOR_ID,
        employeesCount: timesheetsMock_1.orgEmployees.length,
        totalMinutes: timesheetsMock_1.orgEmployees.length * 168 * 60,
        totalPayrollKopecks: timesheetsMock_1.orgEmployees.reduce((s, e) => s + rateKopForEmployee(e.id, 2026, 1) * 168, 0),
        contentHash: "sha256:a91f…3b07",
        reopens: [],
    },
    {
        id: "snap-2026-02",
        year: 2026,
        month: 2,
        closedAt: "2026-03-04T11:15:00.000Z",
        closedByEmployeeId: timesheetsMock_1.DIRECTOR_ID,
        employeesCount: timesheetsMock_1.orgEmployees.length,
        totalMinutes: timesheetsMock_1.orgEmployees.length * 160 * 60,
        totalPayrollKopecks: timesheetsMock_1.orgEmployees.reduce((s, e) => s + rateKopForEmployee(e.id, 2026, 2) * 160, 0),
        contentHash: "sha256:7c2e…ff19",
        reopens: [
            {
                at: "2026-03-12T09:40:00.000Z",
                actorEmployeeId: timesheetsMock_1.DIRECTOR_ID,
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
        closedByEmployeeId: timesheetsMock_1.DIRECTOR_ID,
        employeesCount: timesheetsMock_1.orgEmployees.length,
        totalMinutes: timesheetsMock_1.orgEmployees.length * 168 * 60,
        totalPayrollKopecks: timesheetsMock_1.orgEmployees.reduce((s, e) => s + rateKopForEmployee(e.id, 2026, 3) * 168, 0),
        contentHash: "sha256:b550…91a4",
        reopens: [],
    },
];
function findSnapshot(year, month) {
    return exports.closedSnapshots.find((s) => s.year === year && s.month === month);
}
function evaluateReadiness(year, month) {
    const snap = findSnapshot(year, month);
    const isCurrent = year === timesheetsMock_1.CURRENT_TS_YEAR && month === timesheetsMock_1.CURRENT_TS_MONTH;
    if (snap) {
        const allOk = [
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
    const periodTimesheets = isCurrent
        ? timesheetsMock_1.initialTimesheets
        : [];
    const totalEmployees = timesheetsMock_1.orgEmployees.length;
    const byStatus = {
        draft: 0,
        submitted: 0,
        manager_approved: 0,
        approved: 0,
        rejected: 0,
    };
    for (const ts of periodTimesheets)
        byStatus[ts.status] += 1;
    const missing = timesheetsMock_1.orgEmployees
        .filter((e) => !periodTimesheets.find((t) => t.employeeId === e.id))
        .map((e) => e.id);
    const planLocked = {
        id: "plan-locked",
        label: "План спринта зафиксирован",
        description: "План спринта должен быть в статусе «Зафиксирован» к моменту закрытия.",
        status: "ok",
        detail: "План на этот месяц зафиксирован 28-го числа предыдущего месяца.",
        blocking: true,
    };
    const notSent = [
        ...periodTimesheets.filter((t) => t.status === "draft").map((t) => t.employeeId),
        ...missing,
    ];
    const tsSubmitted = {
        id: "ts-submitted",
        label: "Все табели отправлены",
        description: "Каждый сотрудник переводит свой табель в статус «На согласовании».",
        status: notSent.length === 0 ? "ok" : "fail",
        detail: notSent.length === 0
            ? "Отправили все сотрудники."
            : `Не отправили: ${notSent.length}.`,
        problemCount: notSent.length,
        problemEmployeeIds: notSent,
        blocking: true,
    };
    const notManagerApproved = periodTimesheets
        .filter((t) => t.status === "submitted" || t.status === "draft" || t.status === "rejected")
        .map((t) => t.employeeId);
    const tsMgrApproved = {
        id: "ts-manager-approved",
        label: "Все табели согласованы руководителями",
        description: "Прямые руководители согласовывают табели своих подчинённых.",
        status: notManagerApproved.length === 0 ? "ok" : "fail",
        detail: notManagerApproved.length === 0
            ? "Все согласованы."
            : `Ожидают согласования: ${notManagerApproved.length}.`,
        problemCount: notManagerApproved.length,
        problemEmployeeIds: notManagerApproved,
        blocking: true,
    };
    const notDirectorApproved = periodTimesheets
        .filter((t) => t.status !== "approved")
        .map((t) => t.employeeId);
    const tsDirApproved = {
        id: "ts-director-approved",
        label: "Все табели утверждены директором",
        description: "Финальное утверждение директором переводит табель в неизменяемое состояние.",
        status: notDirectorApproved.length === 0 ? "ok" : "fail",
        detail: notDirectorApproved.length === 0
            ? "Все утверждены."
            : `Не утверждены: ${notDirectorApproved.length}.`,
        problemCount: notDirectorApproved.length,
        problemEmployeeIds: notDirectorApproved,
        blocking: true,
    };
    const rejected = periodTimesheets.filter((t) => t.status === "rejected").map((t) => t.employeeId);
    const noRejected = {
        id: "no-rejected",
        label: "Нет отклонённых табелей",
        description: "Отклонённые табели должны быть переотправлены и согласованы заново.",
        status: rejected.length === 0 ? "ok" : "fail",
        detail: rejected.length === 0
            ? "Отклонённых нет."
            : `Отклонено: ${rejected.length}. Требуется доработка.`,
        problemCount: rejected.length,
        problemEmployeeIds: rejected,
        blocking: true,
    };
    const missingGradesIds = periodTimesheets
        .filter((t) => t.rows.some((r) => r.managerGrade === "none" || r.businessGrade === "none"))
        .map((t) => t.employeeId);
    const gradesSet = {
        id: "grades-set",
        label: "Оценки руководителя и бизнеса проставлены",
        description: "По всем строкам должны быть выставлены оценки качества (ТЗ §14.5).",
        status: missingGradesIds.length === 0 ? "ok" : "warn",
        detail: missingGradesIds.length === 0
            ? "Все оценки проставлены."
            : `Без оценок: ${missingGradesIds.length}. Будут учтены с нулевыми коэффициентами.`,
        problemCount: missingGradesIds.length,
        problemEmployeeIds: missingGradesIds,
        blocking: false,
    };
    const noRateIds = timesheetsMock_1.orgEmployees
        .filter((e) => rateKopForEmployee(e.id, year, month) === 0)
        .map((e) => e.id);
    const finOk = {
        id: "no-finance-discrepancy",
        label: "Финансовых расхождений нет",
        description: "Для каждого сотрудника есть активная базовая ставка на 1-е число периода.",
        status: noRateIds.length === 0 ? "ok" : "fail",
        detail: noRateIds.length === 0
            ? "Базовые ставки найдены для всех сотрудников."
            : `Без активной ставки: ${noRateIds.length}.`,
        problemCount: noRateIds.length,
        problemEmployeeIds: noRateIds,
        blocking: true,
    };
    const items = [planLocked, tsSubmitted, tsMgrApproved, tsDirApproved, noRejected, gradesSet, finOk];
    const blockers = items.filter((i) => i.blocking && i.status === "fail");
    const status = blockers.length === 0 ? "ready" : "open";
    const totalMin = periodTimesheets.reduce((s, t) => s + (0, timesheetsMock_1.totalMinutes)(t), 0);
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
function buildPeriodOptions() {
    const options = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(timesheetsMock_1.CURRENT_TS_YEAR, timesheetsMock_1.CURRENT_TS_MONTH - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const snap = findSnapshot(y, m);
        const status = snap
            ? "closed"
            : y === timesheetsMock_1.CURRENT_TS_YEAR && m === timesheetsMock_1.CURRENT_TS_MONTH
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
exports.MONTHS_FULL_RU = MONTH_RU;
//# sourceMappingURL=periodCloseMock.js.map