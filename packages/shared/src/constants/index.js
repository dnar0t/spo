"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStatus = exports.ReportStatus = exports.ReportType = exports.WorkItemType = exports.PERIOD_STATE = exports.PeriodState = exports.ROLES = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["MANAGER"] = "manager";
    Role["PLANNER"] = "planner";
    Role["EMPLOYEE"] = "employee";
    Role["VIEWER"] = "viewer";
})(Role || (exports.Role = Role = {}));
exports.ROLES = {
    ADMIN: 'admin',
    DIRECTOR: 'director',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    BUSINESS: 'business',
    ACCOUNTANT: 'accountant',
    VIEWER: 'viewer',
    HR: 'hr',
    FINANCE: 'finance',
};
var PeriodState;
(function (PeriodState) {
    PeriodState["DRAFT"] = "draft";
    PeriodState["ACTIVE"] = "active";
    PeriodState["FROZEN"] = "frozen";
    PeriodState["APPROVED"] = "approved";
    PeriodState["ARCHIVED"] = "archived";
})(PeriodState || (exports.PeriodState = PeriodState = {}));
exports.PERIOD_STATE = {
    PLANNING: 'PLANNING',
    PLAN_FIXED: 'PLAN_FIXED',
    FACT_LOADED: 'FACT_LOADED',
    EVALUATIONS_DONE: 'EVALUATIONS_DONE',
    PERIOD_CLOSED: 'PERIOD_CLOSED',
    PERIOD_REOPENED: 'PERIOD_REOPENED',
};
var WorkItemType;
(function (WorkItemType) {
    WorkItemType["TASK"] = "task";
    WorkItemType["BUG"] = "bug";
    WorkItemType["EPIC"] = "epic";
    WorkItemType["STORY"] = "story";
    WorkItemType["SUBTASK"] = "subtask";
    WorkItemType["RESEARCH"] = "research";
    WorkItemType["SUPPORT"] = "support";
    WorkItemType["ADMIN"] = "admin";
    WorkItemType["VACATION"] = "vacation";
    WorkItemType["SICK_LEAVE"] = "sick_leave";
    WorkItemType["DAY_OFF"] = "day_off";
    WorkItemType["TRAINING"] = "training";
})(WorkItemType || (exports.WorkItemType = WorkItemType = {}));
var ReportType;
(function (ReportType) {
    ReportType["DAILY"] = "daily";
    ReportType["WEEKLY"] = "weekly";
    ReportType["MONTHLY"] = "monthly";
    ReportType["QUARTERLY"] = "quarterly";
    ReportType["YEARLY"] = "yearly";
})(ReportType || (exports.ReportType = ReportType = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "draft";
    ReportStatus["SUBMITTED"] = "submitted";
    ReportStatus["REVIEWING"] = "reviewing";
    ReportStatus["NEEDS_REVISION"] = "needs_revision";
    ReportStatus["APPROVED"] = "approved";
    ReportStatus["REJECTED"] = "rejected";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["NOT_STARTED"] = "not_started";
    WorkflowStatus["IN_PROGRESS"] = "in_progress";
    WorkflowStatus["PENDING_APPROVAL"] = "pending_approval";
    WorkflowStatus["APPROVED"] = "approved";
    WorkflowStatus["REJECTED"] = "rejected";
    WorkflowStatus["CANCELLED"] = "cancelled";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
//# sourceMappingURL=index.js.map