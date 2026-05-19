import { type Employee } from "./planningMock";
import { type BusinessGrade, type ManagerGrade } from "./salaryMock";
export type TimesheetStatus = "draft" | "submitted" | "manager_approved" | "approved" | "rejected";
export declare const TIMESHEET_STATUS_LABEL_RU: Record<TimesheetStatus, string>;
export interface EmployeeOrg extends Employee {
    managerId: string | null;
    isDirector?: boolean;
}
export declare const orgEmployees: EmployeeOrg[];
export declare const DIRECTOR_ID = "e-pm-1";
export declare function getSubordinates(managerId: string): EmployeeOrg[];
export declare function visibleEmployeesFor(viewerId: string): EmployeeOrg[];
export type RowSource = "plan" | "worklog";
export interface TimesheetRow {
    id: string;
    issueIdReadable: string;
    source: RowSource;
    minutes: number;
    comment?: string;
    managerGrade: ManagerGrade;
    businessGrade: BusinessGrade;
}
export interface TimesheetRowChange {
    at: string;
    actorId: string;
    rowId: string;
    field: "minutes" | "managerGrade" | "businessGrade";
    fromValue: string;
    toValue: string;
}
export interface Timesheet {
    id: string;
    employeeId: string;
    year: number;
    month: number;
    status: TimesheetStatus;
    rows: TimesheetRow[];
    history: {
        at: string;
        actorId: string;
        fromStatus: TimesheetStatus | null;
        toStatus: TimesheetStatus;
        comment?: string;
    }[];
    rowChanges: TimesheetRowChange[];
}
export declare const HOURS_TO_MIN = 60;
export declare const minutesToHoursStr: (min: number) => string;
export declare const parseHoursToMinutes: (input: string) => number;
export declare const CURRENT_TS_YEAR = 2026;
export declare const CURRENT_TS_MONTH = 4;
export declare const initialTimesheets: Timesheet[];
export declare function totalMinutes(ts: Timesheet): number;
export declare function totalHours(ts: Timesheet): number;
export type ViewerRole = "self" | "manager" | "director";
export interface ActionFlags {
    canEdit: boolean;
    canSubmit: boolean;
    canManagerApprove: boolean;
    canDirectorApprove: boolean;
    canReject: boolean;
    canRecall: boolean;
}
export declare function actionsFor(viewer: ViewerRole, status: TimesheetStatus): ActionFlags;
