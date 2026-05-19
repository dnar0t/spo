export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface AdminUserDto {
    id: string;
    login: string;
    email: string;
    fullName: string;
    employeeId: string;
    roles: string[];
    isActive: boolean;
    source: string;
    twoFactorEnabled: boolean;
    abacProjects: string[];
    abacSystems: string[];
    abacRoles: string[];
    lastLoginAt: string | null;
    createdAt: string;
    managerId: string | null;
    managerName: string | null;
    canPlan: boolean;
}
export interface DictionaryRoleDto {
    id: string;
    name: string;
    label: string;
}
export interface DictionaryProjectDto {
    id: string;
    shortName: string;
    name: string;
}
export interface DictionarySystemDto {
    id: string;
    name: string;
}
export interface DictionaryWorkRoleDto {
    id: string;
    name: string;
    label: string;
}
export interface AdminDictionariesDto {
    workRoles: DictionaryWorkRoleDto[];
    evaluationScales: string[];
    projects: DictionaryProjectDto[];
    systems: DictionarySystemDto[];
}
export interface PlanningSettingsListItemDto {
    id: string;
    workHoursPerMonth: number | null;
    reservePercent: number | null;
    testPercent: number | null;
    debugPercent: number | null;
    mgmtPercent: number | null;
    yellowThreshold: number | null;
    redThreshold: number | null;
    businessGroupingLevel: string | null;
    month: number | null;
    year: number | null;
    updatedBy: string;
    updatedAt: string;
    createdAt: string;
}
export interface PlanningSettingsDto {
    workHoursPerMonth?: number | null;
    reservePercent?: number | null;
    testPercent?: number | null;
    debugPercent?: number | null;
    mgmtPercent?: number | null;
    yellowThreshold?: number | null;
    redThreshold?: number | null;
    month?: number | null;
    year?: number | null;
}
export interface IntegrationDto {
    id: string;
    name: string;
    description: string;
    status: string;
    baseUrl: string | null;
    secretMask: string | null;
    lastSyncAt: string | null;
    notes: string | null;
}
export interface AuditEventDto {
    id: string;
    at: string;
    action: string;
    severity: string;
    actorUserId: string;
    actorLogin: string;
    actorName: string;
    entityType: string | null;
    entityId: string | null;
    entityLabel: string | null;
    ip: string | null;
    userAgent: string | null;
    message: string;
}
export interface UserSessionDto {
    id: string;
    userId: string;
    userLogin: string;
    userName: string;
    startedAt: string;
    lastActivityAt: string;
    ip: string;
    userAgent: string;
    endedAt: string | null;
    endReason: string | null;
}
export interface SensitiveChangeDto {
    id: string;
    at: string;
    actorUserId: string;
    actorLogin: string;
    actorName: string;
    targetEmployeeId: string;
    targetEmployeeName: string;
    kind: string;
    field: string;
    fromValue: string;
    toValue: string;
    reason: string | null;
}
export declare function useAdmin(): {
    useUsers: (search?: string, isActive?: boolean, page?: number, limit?: number) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<AdminUserDto>, Error>;
    useCreateUser: () => import("@tanstack/react-query").UseMutationResult<AdminUserDto, Error, {
        login: string;
        email: string;
        fullName: string;
        employeeId: string;
    }, unknown>;
    useUpdateUser: () => import("@tanstack/react-query").UseMutationResult<AdminUserDto, Error, {
        id: string;
        email: string;
        fullName: string;
        isActive: boolean;
        canPlan?: boolean;
    }, {
        snapshots: [readonly unknown[], PaginatedResult<AdminUserDto> | undefined][];
    }>;
    useDeactivateUser: () => import("@tanstack/react-query").UseMutationResult<void, Error, string, {
        snapshots: [readonly unknown[], PaginatedResult<AdminUserDto> | undefined][];
    }>;
    useAssignRoles: () => import("@tanstack/react-query").UseMutationResult<AdminUserDto, Error, {
        id: string;
        roles: string[];
    }, unknown>;
    useAssignManager: () => import("@tanstack/react-query").UseMutationResult<AdminUserDto, Error, {
        id: string;
        managerId: string;
    }, unknown>;
    useDictionaries: () => import("@tanstack/react-query").UseQueryResult<AdminDictionariesDto, Error>;
    useAuditLog: (filters?: {
        userId?: string;
        action?: string;
        entityType?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
    }) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<AuditEventDto>, Error>;
    useSessions: () => import("@tanstack/react-query").UseQueryResult<UserSessionDto[], Error>;
    useSensitiveChanges: (filters?: {
        page?: number;
        limit?: number;
    }) => import("@tanstack/react-query").UseQueryResult<PaginatedResult<SensitiveChangeDto>, Error>;
    useListPlanningSettings: () => import("@tanstack/react-query").UseQueryResult<PlanningSettingsListItemDto[], Error>;
    useCreatePlanningSettings: () => import("@tanstack/react-query").UseMutationResult<{
        id: string;
    }, Error, PlanningSettingsDto, unknown>;
    useUpdatePlanningSettings: () => import("@tanstack/react-query").UseMutationResult<void, Error, {
        id: string;
    } & PlanningSettingsDto, unknown>;
    useDeletePlanningSettings: () => import("@tanstack/react-query").UseMutationResult<void, Error, string, unknown>;
    useIntegrations: () => import("@tanstack/react-query").UseQueryResult<IntegrationDto[], Error>;
    useUpdateIntegration: () => import("@tanstack/react-query").UseMutationResult<IntegrationDto, Error, {
        id: string;
        baseUrl?: string;
        secret?: string;
        login?: string;
        password?: string;
        baseDn?: string;
        bindDn?: string;
        notes?: string;
    }, unknown>;
};
