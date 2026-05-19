import type { WorkRole, BacklogIssue, Employee } from '@/lib/planning';
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
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface BacklogItemDto {
    id: string;
    issueNumber: string;
    summary: string;
    youtrackIssueId: string | null;
    assigneeId: string | null;
    readinessPercent: number;
    isPlanned: boolean;
    totalPlannedHours: number;
    sortOrder: number;
    parentIssueNumber: string | null;
    children: BacklogItemDto[];
}
export interface EmployeeCapacityDto {
    employeeId: string;
    fullName: string | null;
    availableHours: number;
    plannedHours: number;
    loadPercent: number;
    loadZone: "GREEN" | "YELLOW" | "RED";
    taskCount: number;
}
export interface CapacitySummaryDto {
    employees: EmployeeCapacityDto[];
    totalAvailableHours: number;
    totalPlannedHours: number;
    totalLoadPercent: number;
    employeeCount: number;
}
export interface AssignTaskResultDto {
    taskId: string;
    issueNumber: string;
    assigneeId: string;
    totalPlannedHours: number;
    plannedDevHours: number;
    plannedTestHours: number;
    plannedDebugHours: number;
    plannedMgmtHours: number;
}
export interface UnassignTaskResultDto {
    taskId: string;
    issueNumber: string;
    wasAssigned: boolean;
}
export interface FixPlanResultDto {
    sprintPlanId: string;
    versionNumber: number;
    totalPlannedHours: number;
    taskCount: number;
    fixedAt: string;
    fixedByUserId: string;
}
export interface PlanVersionDto {
    id: string;
    versionNumber: number;
    isFixed: boolean;
    fixedAt: string | null;
    fixedByUserId: string | null;
    totalPlannedHours: number;
    taskCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface UpdateSortResultDto {
    taskId: string;
    sortOrder: number;
}
export interface UpdateReadinessResultDto {
    taskId: string;
    readinessPercent: number;
}
export interface TransitionResultDto {
    periodId: string;
    previousState: string;
    newState: string;
    transitionedAt: string;
}
export declare function flattenBacklogItems(items: BacklogItemDto[], parentIssueNumber?: string | null): BacklogIssue[];
export declare function capacityToEmployees(capacity: CapacitySummaryDto, workRole?: WorkRole): Employee[];
export declare const planningKeys: {
    all: readonly ["planning"];
    periods: () => readonly ["planning", "periods"];
    period: (id: string) => readonly ["planning", "period", string];
    backlog: (periodId: string, filters?: Record<string, unknown>) => readonly ["planning", "backlog", string, Record<string, unknown> | undefined];
    capacity: (periodId: string) => readonly ["planning", "capacity", string];
    planVersions: (periodId: string) => readonly ["planning", "planVersions", string];
};
export declare function usePlanning(): {
    usePeriods: (page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<PlanningPeriodDto>, Error>;
    usePeriodDetail: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<PlanningPeriodDto, Error>;
    useBacklog: (periodId: string | null, filters?: {
        system?: string;
        project?: string;
        priority?: string;
        type?: string;
        status?: string;
        assignee?: string;
        reporter?: string;
        isPlanned?: string;
        readinessMin?: number;
        readinessMax?: number;
        search?: string;
        page?: number;
        limit?: number;
    }) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<BacklogItemDto>, Error>;
    useCapacity: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<CapacitySummaryDto, Error>;
    usePlanVersions: (periodId: string | null) => import("@tanstack/react-query").UseQueryResult<PlanVersionDto[], Error>;
    useAssignTask: () => import("@tanstack/react-query").UseMutationResult<AssignTaskResultDto, Error, {
        periodId: string;
        taskId: string;
        employeeId: string;
        plannedHours: number;
    }, unknown>;
    useUnassignTask: () => import("@tanstack/react-query").UseMutationResult<UnassignTaskResultDto, Error, {
        periodId: string;
        taskId: string;
    }, unknown>;
    useFixPlan: () => import("@tanstack/react-query").UseMutationResult<FixPlanResultDto, Error, {
        periodId: string;
        comment?: string;
    }, unknown>;
    useUpdatePeriod: () => import("@tanstack/react-query").UseMutationResult<PlanningPeriodDto, Error, {
        periodId: string;
        workHoursPerMonth?: number;
        reservePercent?: number;
        testPercent?: number;
        debugPercent?: number;
        mgmtPercent?: number;
        yellowThreshold?: number;
        redThreshold?: number;
        businessGroupingLevel?: string;
        employeeFilter?: string[];
        projectFilter?: string[];
        priorityFilter?: string[];
    }, unknown>;
    useTransitionPeriod: () => import("@tanstack/react-query").UseMutationResult<TransitionResultDto, Error, {
        periodId: string;
        transition: string;
        reason?: string;
    }, unknown>;
    useUpdateTaskSort: () => import("@tanstack/react-query").UseMutationResult<UpdateSortResultDto, Error, {
        periodId: string;
        taskId: string;
        sortOrder: number;
    }, unknown>;
    useUpdateTaskReadiness: () => import("@tanstack/react-query").UseMutationResult<UpdateReadinessResultDto, Error, {
        periodId: string;
        taskId: string;
        readinessPercent: number;
    }, unknown>;
    flattenBacklogItems: typeof flattenBacklogItems;
    capacityToEmployees: typeof capacityToEmployees;
    planningKeys: {
        all: readonly ["planning"];
        periods: () => readonly ["planning", "periods"];
        period: (id: string) => readonly ["planning", "period", string];
        backlog: (periodId: string, filters?: Record<string, unknown>) => readonly ["planning", "backlog", string, Record<string, unknown> | undefined];
        capacity: (periodId: string) => readonly ["planning", "capacity", string];
        planVersions: (periodId: string) => readonly ["planning", "planVersions", string];
    };
    queryClient: import("@tanstack/react-query").QueryClient;
};
