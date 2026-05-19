export type ChecklistItemStatus = "ok" | "warn" | "fail";
export interface ChecklistItemDto {
    id: string;
    label: string;
    description: string;
    status: ChecklistItemStatus;
    detail?: string;
    problemCount?: number;
    problemEmployeeIds?: string[];
    blocking: boolean;
}
export interface PeriodReadinessDto {
    year: number;
    month: number;
    status: "open" | "ready" | "closed";
    items: ChecklistItemDto[];
    totalEmployees: number;
    byStatus: Record<string, number>;
    totalMinutes: number;
    totalPayrollKopecks: number;
    missingTimesheetEmployeeIds: string[];
}
export interface ClosePeriodResultDto {
    periodId: string;
    previousState: string;
    currentState: string;
    closedAt: string;
    snapshotId: string;
}
export interface ReopenPeriodResultDto {
    periodId: string;
    previousState: string;
    currentState: string;
    reopenedAt: string;
    reopenReason: string;
}
export interface SnapshotStatusDto {
    periodId: string;
    hasSnapshot: boolean;
    snapshotId: string | null;
    createdAt: string | null;
}
export interface SnapshotDto {
    id: string;
    periodId: string;
    createdAt: string;
    employeeRates?: unknown;
    formulas?: unknown;
    evaluationScales?: unknown;
    workItems?: unknown;
    issues?: unknown;
    issueHierarchy?: unknown;
    reportLines?: unknown;
    aggregates?: {
        totalEmployees: number;
        totalMinutes: number;
        totalPayrollKopecks: number;
    };
}
export declare const periodCloseKeys: {
    all: readonly ["periodClose"];
    periods: () => readonly ["periodClose", "periods"];
    readiness: (periodId: string) => readonly ["periodClose", "readiness", string];
    snapshot: (periodId: string) => readonly ["periodClose", "snapshot", string];
    snapshotStatus: (periodId: string) => readonly ["periodClose", "snapshotStatus", string];
    statistics: (periodId: string) => readonly ["periodClose", "statistics", string];
};
export declare function usePeriodClose(): {
    usePeriods: (page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<PlanningPeriodDto>, Error>;
    usePeriodReadiness: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<PeriodReadinessDto, Error>;
    useClosePeriod: () => import("@tanstack/react-query").UseMutationResult<ClosePeriodResultDto, Error, {
        periodId: string;
        reason?: string;
    }, unknown>;
    useReopenPeriod: () => import("@tanstack/react-query").UseMutationResult<ReopenPeriodResultDto, Error, {
        periodId: string;
        reason: string;
    }, unknown>;
    useSnapshotStatus: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<SnapshotStatusDto, Error>;
    useSnapshot: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<SnapshotDto, Error>;
    usePeriodStatistics: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<PeriodStatisticsDto, Error>;
    periodCloseKeys: {
        all: readonly ["periodClose"];
        periods: () => readonly ["periodClose", "periods"];
        readiness: (periodId: string) => readonly ["periodClose", "readiness", string];
        snapshot: (periodId: string) => readonly ["periodClose", "snapshot", string];
        snapshotStatus: (periodId: string) => readonly ["periodClose", "snapshotStatus", string];
        statistics: (periodId: string) => readonly ["periodClose", "statistics", string];
    };
    queryClient: import("@tanstack/react-query").QueryClient;
};
