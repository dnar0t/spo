export declare enum Role {
    ADMIN = "admin",
    MANAGER = "manager",
    PLANNER = "planner",
    EMPLOYEE = "employee",
    VIEWER = "viewer"
}
export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly DIRECTOR: "director";
    readonly MANAGER: "manager";
    readonly EMPLOYEE: "employee";
    readonly BUSINESS: "business";
    readonly ACCOUNTANT: "accountant";
    readonly VIEWER: "viewer";
    readonly HR: "hr";
    readonly FINANCE: "finance";
};
export type RoleType = (typeof ROLES)[keyof typeof ROLES];
export declare enum PeriodState {
    DRAFT = "draft",
    ACTIVE = "active",
    FROZEN = "frozen",
    APPROVED = "approved",
    ARCHIVED = "archived"
}
export declare const PERIOD_STATE: {
    readonly PLANNING: "PLANNING";
    readonly PLAN_FIXED: "PLAN_FIXED";
    readonly FACT_LOADED: "FACT_LOADED";
    readonly EVALUATIONS_DONE: "EVALUATIONS_DONE";
    readonly PERIOD_CLOSED: "PERIOD_CLOSED";
    readonly PERIOD_REOPENED: "PERIOD_REOPENED";
};
export type PeriodStateType = (typeof PERIOD_STATE)[keyof typeof PERIOD_STATE];
export declare enum WorkItemType {
    TASK = "task",
    BUG = "bug",
    EPIC = "epic",
    STORY = "story",
    SUBTASK = "subtask",
    RESEARCH = "research",
    SUPPORT = "support",
    ADMIN = "admin",
    VACATION = "vacation",
    SICK_LEAVE = "sick_leave",
    DAY_OFF = "day_off",
    TRAINING = "training"
}
export declare enum ReportType {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}
export declare enum ReportStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    REVIEWING = "reviewing",
    NEEDS_REVISION = "needs_revision",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum WorkflowStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    PENDING_APPROVAL = "pending_approval",
    APPROVED = "approved",
    REJECTED = "rejected",
    CANCELLED = "cancelled"
}
