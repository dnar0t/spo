export type WorkRole = "development" | "testing" | "management" | "other";
export type Priority = "Blocker" | "High" | "Medium" | "Low";
export type IssueType = "Epic" | "Feature" | "Story" | "Task" | "Bug";
export type IssueState = "Open" | "In Progress" | "In Review" | "Testing" | "Done" | "Reopened";
export interface Employee {
    id: string;
    name: string;
    position: string;
    workRole: WorkRole;
    monthlyNetSalary: number;
    ytLogin: string;
}
export interface BacklogIssue {
    id: string;
    idReadable: string;
    summary: string;
    projectId: string;
    systemId: string;
    type: IssueType;
    priority: Priority;
    state: IssueState;
    reporterId: string;
    estimateHours: number;
    readiness: number;
    spentHours?: number;
    parentIdReadable?: string;
    parentSummary?: string;
    parentType?: IssueType;
    assigneeId?: string;
}
export interface Assignment {
    issueId: string;
    employeeId: string;
    role: WorkRole;
}
export type WorkRole = "development" | "testing" | "management" | "other";
export type Priority = "Blocker" | "High" | "Medium" | "Low";
export type IssueType = "Epic" | "Feature" | "Story" | "Task" | "Bug";
export type IssueState = "Open" | "In Progress" | "In Review" | "Testing" | "Done" | "Reopened";
export interface Employee {
    id: string;
    name: string;
    position: string;
    workRole: WorkRole;
    monthlyNetSalary: number;
    ytLogin: string;
}
export interface BacklogIssue {
    id: string;
    idReadable: string;
    summary: string;
    projectId: string;
    systemId: string;
    type: IssueType;
    priority: Priority;
    state: IssueState;
    reporterId: string;
    estimateHours: number;
    readiness: number;
    spentHours?: number;
    parentIdReadable?: string;
    parentSummary?: string;
    parentType?: IssueType;
    assigneeId?: string;
}
export interface Assignment {
    issueId: string;
    employeeId: string;
    role: WorkRole;
}
export interface SprintSettings {
    year: number;
    month: number;
    workHoursPerMonth: number;
    reservePercent: number;
    debugPercent: number;
    testingPercent: number;
    managementPercent: number;
    yellowThreshold: number;
    redThreshold: number;
    workHoursPerYear: number;
}
export declare const DEFAULT_SPRINT_SETTINGS: SprintSettings;
export declare const TYPE_LABEL_RU: Record<string, string>;
export declare const STATE_LABEL_RU: Record<string, string>;
export declare const PRIORITY_LABEL_RU: Record<string, string>;
export declare const MONTHS_RU: string[];
export declare function getSubtasks(parentIdReadable: string, list: BacklogIssue[]): BacklogIssue[];
export declare function effectiveEstimate(issue: BacklogIssue, list: BacklogIssue[]): number;
export declare function effectiveSpent(issue: BacklogIssue, list: BacklogIssue[]): number;
export declare function remainingEstimate(issue: BacklogIssue, list: BacklogIssue[]): number;
export declare function isSubtaskOf(issue: BacklogIssue, list: BacklogIssue[]): BacklogIssue | undefined;
export declare function availableCapacity(settings: SprintSettings): number;
export declare function devHoursPerIssue(estimate: number, settings: SprintSettings): number;
export declare function testingHoursPerIssue(estimate: number, settings: SprintSettings): number;
export declare function managementHoursPerIssue(estimate: number, settings: SprintSettings): number;
export declare function hoursPerIssueForRole(role: WorkRole, estimate: number, settings: SprintSettings): number;
export declare function employeeColumnHours(employeeId: string, role: WorkRole, assignments: Assignment[], backlog: BacklogIssue[], settings: SprintSettings): number;
export declare function totalRoleHours(role: WorkRole, assignments: Assignment[], backlog: BacklogIssue[], settings: SprintSettings): number;
export declare function directionPlannedHours(role: 'testing' | 'management', assignments: Assignment[], backlog: BacklogIssue[], settings: SprintSettings): number;
export declare function directionCapacity(employees: Employee[], role: WorkRole, settings: SprintSettings): number;
export type LoadZone = 'empty' | 'normal' | 'yellow' | 'red';
export declare function loadZone(hours: number, capacity: number, settings: SprintSettings): LoadZone;
