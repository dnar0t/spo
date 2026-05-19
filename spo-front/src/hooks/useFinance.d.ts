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
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface FinanceGroupDto {
    key: string;
    head: IssueLineDto;
    children: IssueLineDto[];
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
export interface IssueLineDto {
    idReadable: string;
    summary: string;
    type: string;
    projectId: string;
    projectShort: string;
    systemId: string;
    systemName: string;
    parentIdReadable?: string;
    parentSummary?: string;
    parentType?: string;
    groupKey: string;
    isGradable: boolean;
    estimateHours: number;
    spentHoursPrior: number;
    minutesThisPeriod: number;
    baseSumKop: number;
    managerSumKop: number;
    contributions: IssueContributionDto[];
    inPlan: boolean;
    hasWorklog: boolean;
}
export interface IssueContributionDto {
    employeeId: string;
    employeeName: string;
    minutes: number;
    managerGrade: string;
    baseRateKop: number;
}
export interface ProjectFinanceDto {
    projectId: string;
    projectShort: string;
    projectName: string;
    totals: FinanceTotalsDto;
}
export interface SystemFinanceDto {
    systemId: string;
    systemName: string;
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
export interface FinanceTotalsDto {
    totalPlannedCost: number;
    totalFactCost: number;
    totalSalary: number;
    totalTaxes: number;
    totalCost: number;
}
export interface FreezeResultDto {
    success: boolean;
    message: string;
    periodId: string;
}
export declare function useFinance(): {
    usePeriods: (page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<PlanningPeriodDto>, Error>;
    useFinanceGroups: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<IssueGroup[], Error>;
    useFinanceByProject: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<ProjectFinanceDto[], Error>;
    useFinanceBySystem: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<SystemFinanceDto[], Error>;
    useFinanceTotals: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<FinanceTotalsDto, Error>;
    useFreezeFinancials: () => import("@tanstack/react-query").UseMutationResult<FreezeResultDto, Error, string, unknown>;
    findPeriodByKey: (periods: PlanningPeriodDto[], key: string) => PlanningPeriodDto | undefined;
    buildPeriodOptions: (periods: PlanningPeriodDto[]) => {
        value: string;
        label: string;
        year: number;
        month: number;
    }[];
};
