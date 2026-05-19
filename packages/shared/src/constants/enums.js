"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemType = exports.PeriodState = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["MANAGER"] = "manager";
    Role["EMPLOYEE"] = "employee";
    Role["VIEWER"] = "viewer";
})(Role || (exports.Role = Role = {}));
var PeriodState;
(function (PeriodState) {
    PeriodState["DRAFT"] = "draft";
    PeriodState["ACTIVE"] = "active";
    PeriodState["CLOSED"] = "closed";
    PeriodState["ARCHIVED"] = "archived";
})(PeriodState || (exports.PeriodState = PeriodState = {}));
var WorkItemType;
(function (WorkItemType) {
    WorkItemType["TASK"] = "task";
    WorkItemType["BUG"] = "bug";
    WorkItemType["FEATURE"] = "feature";
    WorkItemType["EPIC"] = "epic";
    WorkItemType["STORY"] = "story";
    WorkItemType["SUBTASK"] = "subtask";
})(WorkItemType || (exports.WorkItemType = WorkItemType = {}));
//# sourceMappingURL=enums.js.map