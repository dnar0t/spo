"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTHS_RU = exports.PRIORITY_LABEL_RU = exports.STATE_LABEL_RU = exports.TYPE_LABEL_RU = exports.DEFAULT_SPRINT_SETTINGS = void 0;
exports.getSubtasks = getSubtasks;
exports.effectiveEstimate = effectiveEstimate;
exports.effectiveSpent = effectiveSpent;
exports.remainingEstimate = remainingEstimate;
exports.isSubtaskOf = isSubtaskOf;
exports.availableCapacity = availableCapacity;
exports.devHoursPerIssue = devHoursPerIssue;
exports.testingHoursPerIssue = testingHoursPerIssue;
exports.managementHoursPerIssue = managementHoursPerIssue;
exports.hoursPerIssueForRole = hoursPerIssueForRole;
exports.employeeColumnHours = employeeColumnHours;
exports.totalRoleHours = totalRoleHours;
exports.directionPlannedHours = directionPlannedHours;
exports.directionCapacity = directionCapacity;
exports.loadZone = loadZone;
exports.DEFAULT_SPRINT_SETTINGS = {
    year: 2026,
    month: 5,
    workHoursPerMonth: 168,
    reservePercent: 0.3,
    debugPercent: 0.3,
    testingPercent: 0.2,
    managementPercent: 0.1,
    yellowThreshold: 0.8,
    redThreshold: 1.0,
    workHoursPerYear: 1973,
};
exports.TYPE_LABEL_RU = {
    Epic: 'Эпик',
    Feature: 'Функция',
    Story: 'История',
    Task: 'Задача',
    Bug: 'Ошибка',
};
exports.STATE_LABEL_RU = {
    'Open': 'Открыта',
    'In Progress': 'В работе',
    'Submitted': 'Отправлена',
    'Can not Reproduce': 'Не воспроизводится',
    'Fixed': 'Исправлена',
    'Verified': 'Проверена',
    'Closed': 'Закрыта',
    'Duplicate': 'Дубликат',
    'Rejected': 'Отклонена',
};
exports.PRIORITY_LABEL_RU = {
    Blocker: 'Блокер',
    Critical: 'Критический',
    High: 'Высокий',
    Medium: 'Средний',
    Low: 'Низкий',
};
exports.MONTHS_RU = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
];
function getSubtasks(parentIdReadable, list) {
    return list.filter((i) => i.parentIdReadable === parentIdReadable);
}
function effectiveEstimate(issue, list) {
    if (issue.type === 'Story') {
        const subs = getSubtasks(issue.idReadable, list);
        if (subs.length > 0) {
            return Math.round(subs.reduce((s, x) => s + x.estimateHours, 0) * 10) / 10;
        }
    }
    return issue.estimateHours;
}
function effectiveSpent(issue, list) {
    if (issue.type === 'Story') {
        const subs = getSubtasks(issue.idReadable, list);
        if (subs.length > 0) {
            return Math.round(subs.reduce((s, x) => s + (x.spentHours ?? 0), 0) * 10) / 10;
        }
    }
    return issue.spentHours ?? 0;
}
function remainingEstimate(issue, list) {
    const est = effectiveEstimate(issue, list);
    const spent = effectiveSpent(issue, list);
    return Math.max(0, Math.round((est - spent) * 10) / 10);
}
function isSubtaskOf(issue, list) {
    if (!issue.parentIdReadable)
        return undefined;
    return list.find((i) => i.idReadable === issue.parentIdReadable);
}
function availableCapacity(settings) {
    return Math.round(settings.workHoursPerMonth * (1 - settings.reservePercent) * 10) / 10;
}
function devHoursPerIssue(estimate, settings) {
    return round1(estimate * (1 + settings.debugPercent));
}
function testingHoursPerIssue(estimate, settings) {
    return round1(estimate * settings.testingPercent);
}
function managementHoursPerIssue(estimate, settings) {
    return round1(estimate * (1 + settings.debugPercent));
}
function hoursPerIssueForRole(role, estimate, settings) {
    switch (role) {
        case 'development':
            return devHoursPerIssue(estimate, settings);
        case 'testing':
            return testingHoursPerIssue(estimate, settings);
        case 'management':
            return managementHoursPerIssue(estimate, settings);
        default:
            return 0;
    }
}
function round1(v) {
    return Math.round(v * 10) / 10;
}
function employeeColumnHours(employeeId, role, assignments, backlog, settings) {
    let h = 0;
    const idx = new Map(backlog.map((i) => [i.id, i]));
    for (const a of assignments) {
        if (a.employeeId !== employeeId || a.role !== role)
            continue;
        const issue = idx.get(a.issueId);
        if (!issue)
            continue;
        h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
    }
    return round1(h);
}
function totalRoleHours(role, assignments, backlog, settings) {
    const idx = new Map(backlog.map((i) => [i.id, i]));
    let h = 0;
    for (const a of assignments) {
        if (a.role !== role)
            continue;
        const issue = idx.get(a.issueId);
        if (!issue)
            continue;
        h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
    }
    return round1(h);
}
function directionPlannedHours(role, assignments, backlog, settings) {
    const idx = new Map(backlog.map((i) => [i.id, i]));
    const planningIssueIds = new Set(assignments.map((a) => a.issueId));
    let h = 0;
    for (const issueId of planningIssueIds) {
        const issue = idx.get(issueId);
        if (!issue)
            continue;
        h += hoursPerIssueForRole(role, remainingEstimate(issue, backlog), settings);
    }
    return round1(h);
}
function directionCapacity(employees, role, settings) {
    const count = employees.filter((e) => e.workRole === role).length;
    return round1(count * availableCapacity(settings));
}
function loadZone(hours, capacity, settings) {
    if (hours <= 0)
        return 'empty';
    if (capacity <= 0)
        return 'red';
    const ratio = hours / capacity;
    if (ratio >= settings.redThreshold)
        return 'red';
    if (ratio >= settings.yellowThreshold)
        return 'yellow';
    return 'normal';
}
//# sourceMappingURL=planning.js.map