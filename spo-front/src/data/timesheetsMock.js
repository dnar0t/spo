"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialTimesheets = exports.CURRENT_TS_MONTH = exports.CURRENT_TS_YEAR = exports.parseHoursToMinutes = exports.minutesToHoursStr = exports.HOURS_TO_MIN = exports.DIRECTOR_ID = exports.orgEmployees = exports.TIMESHEET_STATUS_LABEL_RU = void 0;
exports.getSubordinates = getSubordinates;
exports.visibleEmployeesFor = visibleEmployeesFor;
exports.totalMinutes = totalMinutes;
exports.totalHours = totalHours;
exports.actionsFor = actionsFor;
const planningMock_1 = require("./planningMock");
const salaryMock_1 = require("./salaryMock");
exports.TIMESHEET_STATUS_LABEL_RU = {
    draft: "Черновик",
    submitted: "На согласовании у руководителя",
    manager_approved: "На утверждении директором",
    approved: "Утверждён",
    rejected: "Отклонён",
};
const MANAGER_MAP = {
    "e-pm-1": null,
    "e-pm-2": "e-pm-1",
    "e-pm-3": "e-pm-1",
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
    "e-qa-1": "e-pm-3",
    "e-qa-2": "e-pm-3",
    "e-qa-3": "e-pm-3",
};
exports.orgEmployees = planningMock_1.employees.map((e) => ({
    ...e,
    managerId: MANAGER_MAP[e.id] ?? null,
    isDirector: MANAGER_MAP[e.id] === null,
}));
exports.DIRECTOR_ID = "e-pm-1";
function getSubordinates(managerId) {
    const result = [];
    const stack = [managerId];
    const seen = new Set([managerId]);
    while (stack.length) {
        const cur = stack.pop();
        for (const e of exports.orgEmployees) {
            if (e.managerId === cur && !seen.has(e.id)) {
                seen.add(e.id);
                result.push(e);
                stack.push(e.id);
            }
        }
    }
    return result;
}
function visibleEmployeesFor(viewerId) {
    const viewer = exports.orgEmployees.find((e) => e.id === viewerId);
    if (!viewer)
        return [];
    return [viewer, ...getSubordinates(viewerId)];
}
exports.HOURS_TO_MIN = 60;
const minutesToHoursStr = (min) => {
    const h = min / 60;
    if (Number.isInteger(h))
        return String(h);
    return (Math.round(h * 10) / 10).toString().replace(".", ",");
};
exports.minutesToHoursStr = minutesToHoursStr;
const parseHoursToMinutes = (input) => {
    const v = input.trim().replace(",", ".");
    if (v === "")
        return 0;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.round(n * 60);
};
exports.parseHoursToMinutes = parseHoursToMinutes;
function planIssuesForEmployee(employeeId) {
    const all = planningMock_1.backlog.map((b) => b.idReadable);
    const seed = planningMock_1.employees.findIndex((e) => e.id === employeeId);
    if (seed < 0)
        return [];
    const start = (seed * 2) % all.length;
    return [all[start], all[(start + 1) % all.length], all[(start + 3) % all.length]];
}
function worklogIssuesForEmployee(employeeId) {
    const all = planningMock_1.backlog.map((b) => b.idReadable);
    const seed = planningMock_1.employees.findIndex((e) => e.id === employeeId);
    if (seed < 0)
        return [];
    return [all[(seed * 3 + 5) % all.length]];
}
function generateRows(employeeId, totalHoursTarget, status) {
    const planIds = planIssuesForEmployee(employeeId);
    const worklogIds = worklogIssuesForEmployee(employeeId).filter((id) => !planIds.includes(id));
    const planParts = [0.45, 0.3, 0.15];
    const worklogParts = worklogIds.length ? [0.1] : [];
    const rows = [];
    const mGrade = status === "manager_approved" || status === "approved" ? salaryMock_1.DEFAULT_MANAGER_GRADE : "none";
    const bGrade = status === "approved" ? salaryMock_1.DEFAULT_BUSINESS_GRADE : "none";
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
exports.CURRENT_TS_YEAR = 2026;
exports.CURRENT_TS_MONTH = 4;
function statusFor(idx) {
    const cycle = [
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
function targetHoursFor(status) {
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
exports.initialTimesheets = exports.orgEmployees.map((e, idx) => {
    const status = statusFor(idx);
    const target = targetHoursFor(status);
    return {
        id: `ts-${e.id}-${exports.CURRENT_TS_YEAR}-${exports.CURRENT_TS_MONTH}`,
        employeeId: e.id,
        year: exports.CURRENT_TS_YEAR,
        month: exports.CURRENT_TS_MONTH,
        status,
        rows: generateRows(e.id, target, status),
        rowChanges: [],
        history: [
            {
                at: new Date(exports.CURRENT_TS_YEAR, exports.CURRENT_TS_MONTH - 1, 1).toISOString(),
                actorId: e.id,
                fromStatus: null,
                toStatus: "draft",
            },
            ...(status !== "draft"
                ? [
                    {
                        at: new Date(exports.CURRENT_TS_YEAR, exports.CURRENT_TS_MONTH - 1, 25).toISOString(),
                        actorId: e.id,
                        fromStatus: "draft",
                        toStatus: "submitted",
                    },
                ]
                : []),
            ...(status === "manager_approved" || status === "approved"
                ? [
                    {
                        at: new Date(exports.CURRENT_TS_YEAR, exports.CURRENT_TS_MONTH - 1, 27).toISOString(),
                        actorId: exports.orgEmployees.find((x) => x.id === e.managerId)?.id ?? exports.DIRECTOR_ID,
                        fromStatus: "submitted",
                        toStatus: "manager_approved",
                    },
                ]
                : []),
            ...(status === "approved"
                ? [
                    {
                        at: new Date(exports.CURRENT_TS_YEAR, exports.CURRENT_TS_MONTH - 1, 28).toISOString(),
                        actorId: exports.DIRECTOR_ID,
                        fromStatus: "manager_approved",
                        toStatus: "approved",
                    },
                ]
                : []),
            ...(status === "rejected"
                ? [
                    {
                        at: new Date(exports.CURRENT_TS_YEAR, exports.CURRENT_TS_MONTH - 1, 26).toISOString(),
                        actorId: exports.orgEmployees.find((x) => x.id === e.managerId)?.id ?? exports.DIRECTOR_ID,
                        fromStatus: "submitted",
                        toStatus: "rejected",
                        comment: "Уточните распределение часов по задаче " + (generateRows(e.id, target, status)[0]?.issueIdReadable ?? ""),
                    },
                ]
                : []),
        ],
    };
});
function totalMinutes(ts) {
    return ts.rows.reduce((s, r) => s + r.minutes, 0);
}
function totalHours(ts) {
    return Math.round((totalMinutes(ts) / 60) * 10) / 10;
}
function actionsFor(viewer, status) {
    const f = {
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
    }
    else if (viewer === "manager") {
        if (status === "submitted") {
            f.canEdit = true;
            f.canManagerApprove = true;
            f.canReject = true;
        }
    }
    else if (viewer === "director") {
        if (status === "manager_approved") {
            f.canEdit = true;
            f.canDirectorApprove = true;
            f.canReject = true;
        }
        if (status === "submitted") {
            f.canManagerApprove = true;
            f.canReject = true;
        }
    }
    return f;
}
//# sourceMappingURL=timesheetsMock.js.map