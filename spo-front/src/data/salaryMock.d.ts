export declare const KOPECKS_PER_RUB = 100;
export type ManagerGrade = "none" | "satisfactory" | "good" | "excellent";
export declare const MANAGER_GRADE_LABEL: Record<ManagerGrade, string>;
export type BusinessGrade = "none" | "no_benefit" | "direct" | "obvious";
export declare const BUSINESS_GRADE_LABEL: Record<BusinessGrade, string>;
export interface FinanceSettings {
    workHoursPerYear: number;
    basePercent: number;
    managerPercent: Record<ManagerGrade, number>;
    businessPercent: Record<BusinessGrade, number>;
}
export declare const DEFAULT_FINANCE_SETTINGS: FinanceSettings;
export declare const DEFAULT_MANAGER_GRADE: ManagerGrade;
export declare const DEFAULT_BUSINESS_GRADE: BusinessGrade;
export interface SalaryRecord {
    id: string;
    employeeId: string;
    effectiveFrom: string;
    monthlyNetKop: number;
    workHoursPerYear: number;
    createdBy: string;
    createdAt: string;
    comment?: string;
}
export declare const initialSalaryHistory: SalaryRecord[];
export declare function activeSalaryFor(history: SalaryRecord[], employeeId: string, year: number, month: number): SalaryRecord | null;
export declare function baseHourlyRateKop(rec: SalaryRecord): number;
export interface RowFinance {
    baseRateKop: number;
    baseSumKop: number;
    managerSumKop: number;
    businessSumKop: number;
    netTotalKop: number;
    effectiveRateKop: number;
    managerPct: number;
    businessPct: number;
}
export declare function computeRowFinance(minutes: number, salary: SalaryRecord | null, managerGrade: ManagerGrade, businessGrade: BusinessGrade, settings: FinanceSettings): RowFinance;
export declare function formatRub(kop: number, opts?: {
    compact?: boolean;
}): string;
export declare function formatRubInt(kop: number): string;
export declare function formatPct(p: number): string;
