import type { IssueType } from '@/lib/planning';
export type BusinessGrade = 'no_benefit' | 'direct' | 'obvious';
export type ManagerGrade = 'senior' | 'middle' | 'junior';
export type TimesheetStatus = 'draft' | 'submitted' | 'manager_approved' | 'approved';
export type SalaryRecord = {
    id: string;
    employeeId: string;
    monthlyNetSalary: number;
    dateFrom: string;
};
export interface Timesheet {
    id: string;
    employeeId: string;
    year: number;
    month: number;
    status: TimesheetStatus;
    entries: {
        date: number;
        hours: number;
    }[];
}
export declare const CURRENT_TS_YEAR = 2026;
export declare const CURRENT_TS_MONTH = 4;
export declare const initialTimesheets: Timesheet[];
export declare const initialSalaryHistory: SalaryRecord[];
export declare const orgEmployees: {
    id: string;
    name: string;
    managerId?: string;
}[];
export declare const BUSINESS_GRADE_LABEL: Record<BusinessGrade, string>;
export declare const MANAGER_GRADE_LABEL: Record<string, string>;
export declare const DEFAULT_FINANCE_SETTINGS: {
    businessGrade: BusinessGrade;
    managerGrade: ManagerGrade;
    businessPercent: Record<BusinessGrade, number>;
};
export declare const KOPECKS_PER_RUB = 100;
export declare const FINANCE_MONTHS_RU: string[];
export declare function activeSalaryFor(employeeId: string, date: Date): SalaryRecord | undefined;
export declare function baseHourlyRateKop(salary: number): number;
export declare function computeRowFinance(minutes: number, salaryRecord: SalaryRecord, managerGrade: ManagerGrade, businessGrade: BusinessGrade): {
    baseSumKop: number;
    managerSumKop: number;
    businessSumKop: number;
    netTotalKop: number;
};
export declare function formatRub(kopecks: number): string;
export declare function formatRubInt(kopecks: number): string;
export declare function formatPct(value: number): string;
export declare function minutesToHoursStr(minutes: number): string;
export declare const TIMESHEET_STATUS_LABEL_RU: Record<string, string>;
export declare function totalMinutes(items: {
    durationMinutes?: number;
}[]): number;
export declare function totalHours(items: {
    durationMinutes?: number;
}[]): string;
export declare function periodTimesheets(year: number, month: number, approvedOnly?: boolean): Timesheet[];
export interface FinanceTotals {
    minutes: number;
    baseSumKop: number;
    managerSumKop: number;
    businessSumKop: number;
    netTotalKop: number;
}
export declare function effectiveRateKop(t: FinanceTotals): number;
export interface IssueContribution {
    employeeId: string;
    employeeName: string;
    minutes: number;
    managerGrade: ManagerGrade;
    baseRateKop: number;
}
export interface IssueLine {
    idReadable: string;
    summary: string;
    type: IssueType;
    projectId: string;
    projectShort: string;
    systemId: string;
    systemName: string;
    parentIdReadable?: string;
    parentSummary?: string;
    parentType?: IssueType;
    groupKey: string;
    isGradable: boolean;
    estimateHours: number;
    spentHoursPrior: number;
    minutesThisPeriod: number;
    baseSumKop: number;
    managerSumKop: number;
    contributions: IssueContribution[];
    inPlan: boolean;
    hasWorklog: boolean;
}
export interface IssueGroup {
    key: string;
    head: IssueLine;
    children: IssueLine[];
    totalMinutes: number;
    estimateHours: number;
    spentHoursPrior: number;
    baseSumKop: number;
    managerSumKop: number;
    readinessAtStart: number;
    readinessPlan: number;
    plannedHours: number;
    plannedCostKop: number;
}
export declare function buildSprintIssueGroups(year: number, month: number, approvedOnly?: boolean): IssueGroup[];
export declare function computeBusinessSumKop(group: IssueGroup, grade: BusinessGrade): number;
export declare function groupNetTotal(group: IssueGroup, businessSumKop: number): number;
export declare function summarizeGroups(groups: IssueGroup[], grades: Record<string, BusinessGrade>): FinanceTotals;
export declare function summarizeByProject(groups: IssueGroup[], grades: Record<string, BusinessGrade>): {
    projectId: string;
    projectShort: string;
    projectName: string;
    totals: FinanceTotals;
}[];
export interface SystemBucket {
    systemId: string;
    systemName: string;
    groups: IssueGroup[];
    totalMinutes: number;
    plannedCostKop: number;
    factCostKop: number;
    baseSumKop: number;
    managerSumKop: number;
    businessSumKop: number;
    readinessAtStartAvg: number;
    readinessPlanAvg: number;
    readinessFactAvg: number;
}
export declare function groupBySystem(groups: IssueGroup[], grades: Record<string, BusinessGrade>, factReadiness?: Record<string, number>): SystemBucket[];
export declare function parseHoursToMinutes(hoursStr: string): number;
