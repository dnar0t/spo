export type TimesheetStatus = "draft" | "submitted" | "manager_approved" | "approved" | "rejected";
export type TimesheetRowSource = "plan" | "worklog";
export type TimesheetRowGrade = "none" | "low" | "medium" | "high" | "critical";
export type TimesheetRowBusinessGrade = "none" | "no_benefit" | "direct" | "obvious";
export interface TimesheetRowDto {
    readonly id: string;
    readonly issueIdReadable: string;
    readonly source: TimesheetRowSource;
    readonly minutes: number;
    readonly comment: string | null;
    readonly managerGrade: TimesheetRowGrade;
    readonly businessGrade: TimesheetRowBusinessGrade;
}
export interface TimesheetStatusTransitionDto {
    readonly id: string;
    readonly actorId: string;
    readonly fromStatus: string;
    readonly toStatus: string;
    readonly comment: string | null;
    readonly createdAt: string;
}
export interface TimesheetRowChangeDto {
    readonly id: string;
    readonly rowId: string;
    readonly actorId: string;
    readonly field: "minutes" | "managerGrade" | "businessGrade";
    readonly fromValue: string;
    readonly toValue: string;
    readonly createdAt: string;
}
export interface TimesheetDto {
    readonly id: string;
    readonly employeeId: string;
    readonly year: number;
    readonly month: number;
    readonly status: TimesheetStatus;
    readonly rows: TimesheetRowDto[];
    readonly history: TimesheetStatusTransitionDto[];
    readonly rowChanges: TimesheetRowChangeDto[];
    readonly createdAt: string;
    readonly updatedAt: string;
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
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface BacklogItemDto {
    id: string;
    idReadable: string;
    summary: string;
    projectId: string;
    projectShort: string;
    projectName: string;
    systemId: string;
    systemName: string;
    type: string;
    priority: string;
    state: string;
    reporterId: string;
    estimateHours: number;
    readiness: number;
    spentHours: number;
    parentIdReadable: string | null;
    parentSummary: string | null;
    parentType: string | null;
    assigneeId: string | null;
    isPlanned: boolean;
    children: BacklogItemDto[];
}
export interface ProjectDto {
    id: string;
    shortName: string;
    name: string;
}
export interface SystemDto {
    id: string;
    name: string;
}
export interface EmployeeOrgDto {
    id: string;
    name: string;
    position: string;
    workRole: string;
    monthlyNetSalary: number;
    ytLogin: string;
    managerId: string | null;
    isDirector: boolean;
}
export declare function useTimesheets(): {
    useMyTimesheet: (year: number, month: number) => import("@tanstack/react-query").UseQueryResult<TimesheetDto | null, Error>;
    useTeamTimesheets: (year: number, month: number, employeeIds: string[]) => import("@tanstack/react-query").UseQueryResult<TimesheetDto[], Error>;
    useTimesheetHistory: (id: string | null) => import("@tanstack/react-query").UseQueryResult<TimesheetStatusTransitionDto[], Error>;
    useUpdateRow: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, {
        timesheetId: string;
        rowId: string;
        minutes?: number;
        managerGrade?: TimesheetRowGrade;
        businessGrade?: TimesheetRowBusinessGrade;
    }, unknown>;
    useAddRow: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, {
        timesheetId: string;
        issueIdReadable: string;
        minutes: number;
    }, unknown>;
    useDeleteRow: () => import("@tanstack/react-query").UseMutationResult<void, Error, {
        timesheetId: string;
        rowId: string;
    }, unknown>;
    useSubmit: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, string, unknown>;
    useRecall: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, string, unknown>;
    useManagerApprove: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, string, unknown>;
    useDirectorApprove: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, string, unknown>;
    useReject: () => import("@tanstack/react-query").UseMutationResult<TimesheetDto, Error, {
        timesheetId: string;
        comment: string;
    }, unknown>;
    usePeriods: (page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<PlanningPeriodDto>, Error>;
    useBacklog: (params?: {
        search?: string;
        isPlanned?: boolean;
        page?: number;
        limit?: number;
    }) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<BacklogItemDto>, Error>;
    useDictionaries: () => import("@tanstack/react-query").UseQueryResult<{
        workRoles: {
            id: string;
            name: string;
            label: string;
        }[];
        evaluationScales: string[];
        projects: ProjectDto[];
        systems: SystemDto[];
    }, Error>;
};
