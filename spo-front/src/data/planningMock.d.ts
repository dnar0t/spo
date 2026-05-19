export type WorkRole = "development" | "testing" | "management" | "other";
export type Priority = "Blocker" | "High" | "Medium" | "Low";
export type IssueType = "Epic" | "Feature" | "Story" | "Task" | "Bug";
export type IssueState = "Open" | "In Progress" | "In Review" | "Testing" | "Done" | "Reopened";
export interface Project {
    id: string;
    shortName: string;
    name: string;
}
export interface SystemRef {
    id: string;
    name: string;
}
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
export declare const projects: Project[];
export declare const systems: SystemRef[];
export declare const employees: Employee[];
export declare const backlog: BacklogIssue[];
export declare const ISSUE_STATES: IssueState[];
export declare const ISSUE_TYPES: IssueType[];
export declare const PRIORITIES: Priority[];
export declare const PRIORITY_LABEL_RU: Record<Priority, string>;
export declare const TYPE_LABEL_RU: Record<IssueType, string>;
export declare const STATE_LABEL_RU: Record<IssueState, string>;
export declare const WORK_ROLE_LABEL_RU: Record<WorkRole, string>;
export declare const YT_BASE_URL = "https://youtrack.company.local";
export declare function ytIssueUrl(idReadable: string): string;
export declare function baseHourlyRate(emp: Employee, workHoursPerYear: number): number;
export declare function getSubtasks(parentIdReadable: string, list?: BacklogIssue[]): BacklogIssue[];
export declare function effectiveEstimate(issue: BacklogIssue, list?: BacklogIssue[]): number;
export declare function effectiveSpent(issue: BacklogIssue, list?: BacklogIssue[]): number;
export declare function remainingEstimate(issue: BacklogIssue, list?: BacklogIssue[]): number;
export declare function isSubtaskOf(issue: BacklogIssue, list?: BacklogIssue[]): BacklogIssue | undefined;
