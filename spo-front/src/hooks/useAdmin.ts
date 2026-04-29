/**
 * useAdmin — хук для взаимодействия с backend API модуля администрирования.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - управление пользователями (CRUD, роли, менеджеры)
 * - справочники
 * - аудит и безопасность
 *
 * Использует api-клиент из @/lib/api.
 * Возвращает React Query-хуки для использования в компонентах.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Типы ответов API
// ============================================================================

/** Пагинированный ответ */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Пользователь из GET /api/admin/users */
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
}

/** Роль из справочника */
export interface DictionaryRoleDto {
  id: string;
  name: string;
  label: string;
}

/** Проект из справочника */
export interface DictionaryProjectDto {
  id: string;
  shortName: string;
  name: string;
}

/** Система из справочника */
export interface DictionarySystemDto {
  id: string;
  name: string;
}

/** Плановое направление из справочника */
export interface DictionaryWorkRoleDto {
  id: string;
  name: string;
  label: string;
}

/** Справочники из GET /api/admin/dictionaries */
export interface AdminDictionariesDto {
  workRoles: DictionaryWorkRoleDto[];
  evaluationScales: string[];
  projects: DictionaryProjectDto[];
  systems: DictionarySystemDto[];
}

/** Планировочные настройки из GET /api/admin/settings/planning */
export interface PlanningSettingsDto {
  workHoursPerMonth: number;
  workHoursPerYear: number;
  reservePercent: number;
  testPercent: number;
  debugPercent: number;
  mgmtPercent: number;
  yellowThreshold: number;
  redThreshold: number;
}

/** Интеграция из GET /api/admin/integrations */
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

/** Событие аудита из GET /api/admin/audit-log */
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

/** Сессия из GET /api/admin/sessions */
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

/** Чувствительное изменение из GET /api/admin/sensitive-changes */
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

// ============================================================================
// Query keys
// ============================================================================

const adminKeys = {
  all: ['admin'] as const,
  users: (filters?: Record<string, unknown>) => ['admin', 'users', filters] as const,
  dictionaries: ['admin', 'dictionaries'] as const,
  auditLog: (filters?: Record<string, unknown>) => ['admin', 'audit-log', filters] as const,
  sessions: ['admin', 'sessions'] as const,
  sensitiveChanges: (filters?: Record<string, unknown>) =>
    ['admin', 'sensitive-changes', filters] as const,
  planningSettings: ['admin', 'settings', 'planning'] as const,
  integrations: ['admin', 'integrations'] as const,
};

// ============================================================================
// Хук
// ============================================================================

export function useAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/admin/users — список пользователей с пагинацией
  // ========================================================================
  const useUsers = (search?: string, isActive?: boolean, page = 1, limit = 50) =>
    useQuery({
      queryKey: adminKeys.users({ search, isActive, page, limit }),
      queryFn: async (): Promise<PaginatedResult<AdminUserDto>> => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (search) params.set('search', search);
        if (isActive !== undefined) params.set('isActive', String(isActive));
        const response = await api.get<PaginatedResult<AdminUserDto>>(
          `/admin/users?${params.toString()}`,
        );
        return response;
      },
      staleTime: 15_000,
    });

  // ========================================================================
  // POST /api/admin/users — создание пользователя
  // ========================================================================
  const useCreateUser = () =>
    useMutation({
      mutationFn: async (data: {
        login: string;
        email: string;
        fullName: string;
        employeeId: string;
      }): Promise<AdminUserDto> => {
        const response = await api.post<AdminUserDto>('/admin/users', data);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        toast({
          title: 'Пользователь создан',
          description: 'Учётная запись успешно создана.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка создания',
          description: error.message || 'Не удалось создать пользователя.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // PUT /api/admin/users/:id — обновление пользователя
  // ========================================================================
  const useUpdateUser = () =>
    useMutation({
      mutationFn: async ({
        id,
        ...data
      }: {
        id: string;
        email: string;
        fullName: string;
        isActive: boolean;
      }): Promise<AdminUserDto> => {
        const response = await api.put<AdminUserDto>(`/admin/users/${id}`, data);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        toast({
          title: 'Изменения сохранены',
          description: 'Данные пользователя обновлены.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка обновления',
          description: error.message || 'Не удалось обновить пользователя.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // DELETE /api/admin/users/:id — деактивация пользователя (soft delete)
  // ========================================================================
  const useDeactivateUser = () =>
    useMutation({
      mutationFn: async (id: string): Promise<void> => {
        await api.delete(`/admin/users/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        toast({
          title: 'Учётная запись деактивирована',
          description: 'Пользователь успешно деактивирован.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка деактивации',
          description: error.message || 'Не удалось деактивировать пользователя.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // PUT /api/admin/users/:id/roles — назначение ролей
  // ========================================================================
  const useAssignRoles = () =>
    useMutation({
      mutationFn: async ({ id, roles }: { id: string; roles: string[] }): Promise<AdminUserDto> => {
        const response = await api.put<AdminUserDto>(`/admin/users/${id}/roles`, { roles });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        toast({
          title: 'Роли назначены',
          description: 'Роли пользователя обновлены.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка назначения ролей',
          description: error.message || 'Не удалось назначить роли.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // PUT /api/admin/users/:id/manager — назначение руководителя
  // ========================================================================
  const useAssignManager = () =>
    useMutation({
      mutationFn: async ({
        id,
        managerId,
      }: {
        id: string;
        managerId: string;
      }): Promise<AdminUserDto> => {
        const response = await api.put<AdminUserDto>(`/admin/users/${id}/manager`, { managerId });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        toast({
          title: 'Руководитель назначен',
          description: 'Руководитель пользователя обновлён.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка назначения руководителя',
          description: error.message || 'Не удалось назначить руководителя.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // GET /api/admin/dictionaries — справочники
  // ========================================================================
  const useDictionaries = () =>
    useQuery({
      queryKey: adminKeys.dictionaries,
      queryFn: async (): Promise<AdminDictionariesDto> => {
        const response = await api.get<AdminDictionariesDto>('/admin/dictionaries');
        return response;
      },
      staleTime: 60_000,
    });

  // ========================================================================
  // GET /api/admin/audit-log — журнал аудита с фильтрами
  // ========================================================================
  const useAuditLog = (filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    useQuery({
      queryKey: adminKeys.auditLog(filters),
      queryFn: async (): Promise<PaginatedResult<AuditEventDto>> => {
        const params = new URLSearchParams();
        params.set('page', String(filters?.page ?? 1));
        params.set('limit', String(filters?.limit ?? 50));
        if (filters?.userId) params.set('userId', filters.userId);
        if (filters?.action) params.set('action', filters.action);
        if (filters?.entityType) params.set('entityType', filters.entityType);
        if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters?.dateTo) params.set('dateTo', filters.dateTo);
        const response = await api.get<PaginatedResult<AuditEventDto>>(
          `/admin/audit-log?${params.toString()}`,
        );
        return response;
      },
      staleTime: 10_000,
    });

  // ========================================================================
  // GET /api/admin/sessions — активные сессии
  // ========================================================================
  const useSessions = () =>
    useQuery({
      queryKey: adminKeys.sessions,
      queryFn: async (): Promise<UserSessionDto[]> => {
        const response = await api.get<UserSessionDto[]>('/admin/sessions');
        return response;
      },
      staleTime: 10_000,
    });

  // ========================================================================
  // GET /api/admin/sensitive-changes — чувствительные изменения
  // ========================================================================
  const useSensitiveChanges = (filters?: { page?: number; limit?: number }) =>
    useQuery({
      queryKey: adminKeys.sensitiveChanges(filters),
      queryFn: async (): Promise<PaginatedResult<SensitiveChangeDto>> => {
        const params = new URLSearchParams();
        params.set('page', String(filters?.page ?? 1));
        params.set('limit', String(filters?.limit ?? 50));
        const response = await api.get<PaginatedResult<SensitiveChangeDto>>(
          `/admin/sensitive-changes?${params.toString()}`,
        );
        return response;
      },
      staleTime: 10_000,
    });

  // ========================================================================
  // GET /api/admin/settings/planning — планировочные настройки
  // ========================================================================
  const usePlanningSettings = () =>
    useQuery({
      queryKey: adminKeys.planningSettings,
      queryFn: async (): Promise<PlanningSettingsDto> => {
        const response = await api.get<PlanningSettingsDto>('/admin/settings/planning');
        return response;
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // PUT /api/admin/settings/planning — обновление планировочных настроек
  // ========================================================================
  const useUpdatePlanningSettings = () =>
    useMutation({
      mutationFn: async (data: PlanningSettingsDto): Promise<PlanningSettingsDto> => {
        const response = await api.put<PlanningSettingsDto>('/admin/settings/planning', data);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.planningSettings });
        toast({
          title: 'Параметры сохранены',
          description: 'Параметры спринта по умолчанию обновлены.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка сохранения',
          description: error.message || 'Не удалось сохранить параметры спринта.',
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // GET /api/admin/integrations — список интеграций
  // ========================================================================
  const useIntegrations = () =>
    useQuery({
      queryKey: adminKeys.integrations,
      queryFn: async (): Promise<IntegrationDto[]> => {
        const response = await api.get<IntegrationDto[]>('/admin/integrations');
        return response;
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // PUT /api/admin/integrations/:id — обновление настроек интеграции
  // ========================================================================
  const useUpdateIntegration = () =>
    useMutation({
      mutationFn: async ({
        id,
        ...data
      }: {
        id: string;
        baseUrl?: string;
        secret?: string;
        notes?: string;
      }): Promise<IntegrationDto> => {
        const response = await api.put<IntegrationDto>(`/admin/integrations/${id}`, data);
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.integrations });
        toast({
          title: 'Настройки интеграции сохранены',
          description: 'Параметры подключения обновлены.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка сохранения',
          description: error.message || 'Не удалось обновить настройки интеграции.',
          variant: 'destructive',
        });
      },
    });

  return {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeactivateUser,
    useAssignRoles,
    useAssignManager,
    useDictionaries,
    useAuditLog,
    useSessions,
    useSensitiveChanges,
    usePlanningSettings,
    useUpdatePlanningSettings,
    useIntegrations,
    useUpdateIntegration,
  };
}
