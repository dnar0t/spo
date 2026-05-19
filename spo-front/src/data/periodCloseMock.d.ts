import { type Timesheet, type TimesheetStatus } from "./timesheetsMock";
export type PeriodStatus = "open" | "ready" | "closed";
export declare const PERIOD_STATUS_LABEL_RU: Record<PeriodStatus, string>;
export interface PeriodSnapshot {
    id: string;
    year: number;
    month: number;
    closedAt: string;
    closedByEmployeeId: string;
    employeesCount: number;
    totalMinutes: number;
    totalPayrollKopecks: number;
    contentHash: string;
    reopens: {
        at: string;
        actorEmployeeId: string;
        reason: string;
        reclosedAt?: string;
    }[];
}
export declare function payrollForTimesheet(ts: Timesheet): number;
export declare const closedSnapshots: PeriodSnapshot[];
export declare function findSnapshot(year: number, month: number): PeriodSnapshot | undefined;
export type ChecklistItemStatus = "ok" | "warn" | "fail";
export interface ChecklistItem {
    id: string;
    label: string;
    description: string;
    status: ChecklistItemStatus;
    detail?: string;
    problemCount?: number;
    problemEmployeeIds?: string[];
    blocking: boolean;
}
export interface PeriodReadiness {
    year: number;
    month: number;
    status: PeriodStatus;
    items: ChecklistItem[];
    totalEmployees: number;
    byStatus: Record<TimesheetStatus, number>;
    totalMinutes: number;
    totalPayrollKopecks: number;
    missingTimesheetEmployeeIds: string[];
}
export declare function evaluateReadiness(year: number, month: number): PeriodReadiness;
export interface PeriodOption {
    year: number;
    month: number;
    label: string;
    status: PeriodStatus;
}
export declare function buildPeriodOptions(): PeriodOption[];
export declare const MONTHS_FULL_RU: string[];
