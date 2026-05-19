import { type EmployeeOrg } from "./timesheetsMock";
import { type WorkRole } from "./planningMock";
export type AppRole = "employee" | "manager" | "business" | "accountant" | "director" | "admin";
export declare const APP_ROLE_LABEL_RU: Record<AppRole, string>;
export interface Privilege {
    id: string;
    group: "Планирование" | "Табели" | "Финансы" | "Отчёты" | "Администрирование";
    label: string;
    defaultRoles: AppRole[];
}
export declare const PRIVILEGES: Privilege[];
export interface AppUser {
    id: string;
    employeeId: string;
    login: string;
    email: string;
    roles: AppRole[];
    active: boolean;
    source: "ldap" | "local";
    twoFactorEnabled: boolean;
    abacProjects: string[];
    abacSystems: string[];
    abacRoles: WorkRole[];
    createdAt: string;
    lastLoginAt?: string;
}
export declare function roleByEmployee(emp: EmployeeOrg): AppRole;
export declare const appUsers: AppUser[];
export declare function findUserByEmployeeId(employeeId: string): AppUser | undefined;
export type AuditAction = "user.login" | "user.login_failed" | "user.logout" | "user.role_changed" | "user.created" | "user.deactivated" | "plan.locked" | "plan.unlocked" | "timesheet.submitted" | "timesheet.manager_approved" | "timesheet.director_approved" | "timesheet.rejected" | "rate.changed" | "rate.deleted" | "period.closed" | "period.reopened" | "settings.changed" | "integration.sync";
export declare const AUDIT_ACTION_LABEL_RU: Record<AuditAction, string>;
export type AuditSeverity = "info" | "warning" | "critical";
export interface AuditEvent {
    id: string;
    at: string;
    action: AuditAction;
    severity: AuditSeverity;
    actorUserId: string;
    entity?: {
        type: string;
        id: string;
        label: string;
    };
    ip?: string;
    userAgent?: string;
    message: string;
}
export declare const auditEvents: AuditEvent[];
export interface UserSession {
    id: string;
    userId: string;
    startedAt: string;
    lastActivityAt: string;
    ip: string;
    userAgent: string;
    endedAt: string | null;
    endReason?: "logout" | "timeout" | "revoked";
}
export declare const userSessions: UserSession[];
export type SensitiveChangeKind = "salary" | "rate" | "role" | "manager" | "permission";
export declare const SENSITIVE_KIND_LABEL_RU: Record<SensitiveChangeKind, string>;
export interface SensitiveChange {
    id: string;
    at: string;
    actorUserId: string;
    targetEmployeeId: string;
    kind: SensitiveChangeKind;
    field: string;
    fromValue: string;
    toValue: string;
    reason?: string;
}
export declare const sensitiveChanges: SensitiveChange[];
export type IntegrationStatus = "connected" | "error" | "disconnected";
export interface IntegrationConfig {
    id: "youtrack" | "github" | "ldap" | "salary1c" | "smtp";
    name: string;
    description: string;
    status: IntegrationStatus;
    baseUrl?: string;
    secretMask?: string;
    lastSyncAt?: string;
    notes?: string;
}
export declare const integrations: IntegrationConfig[];
export type DayKind = "work" | "weekend" | "holiday" | "shortened";
export declare const DAY_KIND_LABEL_RU: Record<DayKind, string>;
export interface WorkTypeRef {
    id: string;
    label: string;
    description: string;
}
export declare const workTypes: WorkTypeRef[];
export declare const referenceProjects: import("./planningMock").Project[];
export declare const referenceSystems: import("./planningMock").SystemRef[];
export declare const referenceWorkRoles: {
    id: WorkRole;
    label: string;
}[];
