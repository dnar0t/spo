export interface PersonalReportLineDto {
    issueNumber: string;
    summary: string;
    stateName: string | null;
    parentIssueNumber: string | null;
    estimationHours: number;
    actualHours: number;
    baseAmount: number;
    managerPercent: number | null;
    managerAmount: number;
    businessPercent: number | null;
    businessAmount: number;
    totalOnHand: number;
    ndfl: number;
    insurance: number;
    reserveVacation: number;
    totalWithTax: number;
    effectiveRate: number | null;
}
export interface PersonalReportTotalsDto {
    totalBaseAmount: number;
    totalManagerAmount: number;
    totalBusinessAmount: number;
    totalOnHand: number;
    totalNdfl: number;
    totalInsurance: number;
    totalReserve: number;
    totalWithTax: number;
    totalHours: number;
}
export interface PersonalReportDto {
    userId: string;
    fullName: string | null;
    periodId: string;
    lines: PersonalReportLineDto[];
    totals: PersonalReportTotalsDto;
}
export interface SummaryReportLineDto {
    issueNumber: string;
    summary: string;
    typeName: string | null;
    priorityName: string | null;
    stateName: string | null;
    assigneeName: string | null;
    isPlanned: boolean;
    readinessPercent: number | null;
    plannedHours: number;
    actualHours: number;
    remainingHours: number;
    plannedCost: number | null;
    actualCost: number | null;
    remainingCost: number | null;
    businessEvaluationType: string | null;
    managerEvaluationType: string | null;
}
export interface GroupedReportDto {
    systemName: string;
    plannedHours: number;
    actualHours: number;
    items: SummaryReportLineDto[];
}
export interface SummaryReportStatistics {
    totalPlannedHours: number;
    totalActualHours: number;
    deviation: number;
    completionPercent: number;
    unplannedHours: number;
    unplannedPercent: number;
    remainingHours: number;
    unfinishedTasks: number;
}
export interface SummaryPeriodInfo {
    id: string;
    month: number;
    year: number;
    state: string;
}
export interface SummaryReportDto {
    period: SummaryPeriodInfo;
    statistics: SummaryReportStatistics;
    groups: GroupedReportDto[];
    page: number;
    pageSize: number;
    total: number;
}
export interface PeriodStatisticsDto {
    totalPlannedHours: number;
    totalActualHours: number;
    deviation: number;
    completionPercent: number;
    unplannedHours: number;
    unplannedPercent: number;
    remainingHours: number;
    unfinishedTasks: number;
}
export interface SummaryReportFilters {
    system?: string;
    groupBy?: string;
    isPlanned?: string;
    search?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
export interface CreateManagerEvaluationDto {
    periodId: string;
    youtrackIssueId: string;
    userId: string;
    evaluationType: string;
    percent: number;
    comment?: string;
}
export interface UpdateManagerEvaluationDto {
    evaluationType?: string;
    percent?: number;
    comment?: string;
}
export interface CreateBusinessEvaluationDto {
    periodId: string;
    youtrackIssueId: string;
    evaluationType: string;
    percent: number;
    comment?: string;
}
export interface UpdateBusinessEvaluationDto {
    evaluationType?: string;
    percent?: number;
    comment?: string;
}
export interface PlanningPeriodDto {
    id: string;
    month: number;
    year: number;
    state: string;
    workHoursPerMonth: number | null;
    reservePercent: number | null;
    testPercent: number | null;
    debugPercent: number | null;
    mgmtPercent: number | null;
    yellowThreshold: number | null;
    redThreshold: number | null;
    businessGroupingLevel: string | null;
    employeeFilter: string[] | null;
    projectFilter: string[] | null;
    priorityFilter: string[] | null;
    createdById: string;
    closedAt: string | null;
    reopenedAt: string | null;
    reopenReason: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface AdminUserDto {
    id: string;
    login: string;
    email: string | null;
    fullName: string | null;
    roles: string[];
    isActive: boolean;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare const reportingKeys: {
    all: readonly ["reporting"];
    summary: (periodId: string, filters?: Record<string, unknown>) => readonly ["reporting", "summary", string, Record<string, unknown> | undefined];
    personal: (periodId: string, userId: string) => readonly ["reporting", "personal", string, string];
    statistics: (periodId: string) => readonly ["reporting", "statistics", string];
    periodsList: () => readonly ["reporting", "periodsList"];
    employeesList: () => readonly ["reporting", "employeesList"];
};
export declare function useReports(): {
    usePeriods: (page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PlanningPeriodDto[], Error>;
    useEmployees: (search?: string) => import("@tanstack/react-query").UseQueryResult<AdminUserDto[], Error>;
    useSummaryReport: (periodId: string | null, filters?: SummaryReportFilters) => import("@tanstack/react-query").UseQueryResult<SummaryReportDto, Error>;
    usePersonalReport: (periodId: string | null, userId: string | null) => import("@tanstack/react-query").UseQueryResult<PersonalReportDto, Error>;
    usePeriodStatistics: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<PeriodStatisticsDto, Error>;
    useSubmitManagerEvaluation: () => import("@tanstack/react-query").UseMutationResult<{
        id: string;
    }, Error, {
        evaluationId?: string;
        periodId: string;
        youtrackIssueId: string;
        userId: string;
        evaluationType: string;
        percent: number;
        comment?: string;
    }, unknown>;
    useSubmitBusinessEvaluation: () => import("@tanstack/react-query").UseMutationResult<{
        id: string;
    }, Error, {
        evaluationId?: string;
        periodId: string;
        youtrackIssueId: string;
        evaluationType: string;
        percent: number;
        comment?: string;
    }, unknown>;
    useRecalculateReports: () => import("@tanstack/react-query").UseMutationResult<{
        personalReportsGenerated: number;
        summaryReportsGenerated: number;
    }, Error, string, unknown>;
    findPeriodByKey: (periods: PlanningPeriodDto[], periodKey: string) => PlanningPeriodDto | undefined;
    buildPeriodOptions: (periods: PlanningPeriodDto[]) => {
        value: string;
        label: string;
        year: number;
        month: number;
    }[];
    keys: {
        all: readonly ["reporting"];
        summary: (periodId: string, filters?: Record<string, unknown>) => readonly ["reporting", "summary", string, Record<string, unknown> | undefined];
        personal: (periodId: string, userId: string) => readonly ["reporting", "personal", string, string];
        statistics: (periodId: string) => readonly ["reporting", "statistics", string];
        periodsList: () => readonly ["reporting", "periodsList"];
        employeesList: () => readonly ["reporting", "employeesList"];
    };
};
