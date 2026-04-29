/**
 * usePlanning — хук для взаимодействия с backend API модуля планирования.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - периоды (список / детали)
 * - бэклог (с фильтрами)
 * - capacity
 * - назначения (assign / unassign)
 * - фиксация плана
 * - версии плана
 * - обновление настроек периода
 * - сортировка задач
 * - готовность задач
 * - переход состояния
 *
 * Использует api-клиент из @/lib/api.
 * Возвращает React Query-хуки для использования в компонентах.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type {
  WorkRole,
  Priority,
  IssueType,
  IssueState,
  BacklogIssue,
  Employee,
  Assignment,
} from "@/data/planningMock";

// ============================================================================
// Типы ответов API (согласно backend-контроллеру и DTO)
// ============================================================================

/** Период из GET /api/planning/periods */
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

/** Пагинированный ответ */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Элемент бэклога из GET /api/planning/periods/:id/backlog */
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

/** Сводка по capacity сотрудника */
export interface EmployeeCapacityDto {
  employeeId: string;
  fullName: string | null;
  availableHours: number;
  plannedHours: number;
  loadPercent: number;
  loadZone: "GREEN" | "YELLOW" | "RED";
  taskCount: number;
}

/** Capacity периода */
export interface CapacitySummaryDto {
  employees: EmployeeCapacityDto[];
  totalAvailableHours: number;
  totalPlannedHours: number;
  totalLoadPercent: number;
  employeeCount: number;
}

/** Результат назначения задачи */
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

/** Результат снятия назначения */
export interface UnassignTaskResultDto {
  taskId: string;
  issueNumber: string;
  wasAssigned: boolean;
}

/** Результат фиксации плана */
export interface FixPlanResultDto {
  sprintPlanId: string;
  versionNumber: number;
  totalPlannedHours: number;
  taskCount: number;
  fixedAt: string;
  fixedByUserId: string;
}

/** Версия плана */
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

/** Результат обновления сортировки */
export interface UpdateSortResultDto {
  taskId: string;
  sortOrder: number;
}

/** Результат обновления готовности */
export interface UpdateReadinessResultDto {
  taskId: string;
  readinessPercent: number;
}

/** Результат перехода состояния */
export interface TransitionResultDto {
  periodId: string;
  previousState: string;
  newState: string;
  transitionedAt: string;
}

// ============================================================================
// Мапперы: DTO из API → типы фронта (планирование)
// ============================================================================

/**
 * Преобразует BacklogItemDto[] (плоский список с вложенными children)
 * в BacklogIssue[] (плоский список, пригодный для фильтрации/сортировки).
 *
 * Поле `idReadable` маппится из `issueNumber`.
 * Поле `parentIdReadable` из `parentIssueNumber`.
 * Поле `estimateHours` из `totalPlannedHours`.
 * Поле `readiness` из `readinessPercent`.
 * Поле `parentIdReadable` и `parentSummary` берутся из parentIssueNumber
 * (фронт ожидает строку readable, а не UUID).
 *
 * Фронт также использует `spentHours`, `assigneeId`, `reporterId` и т.д.
 * Если их нет в ответе API — проставляем разумные умолчания.
 */
export function flattenBacklogItems(
  items: BacklogItemDto[],
  parentIssueNumber?: string | null,
): BacklogIssue[] {
  const result: BacklogIssue[] = [];

  for (const item of items) {
    const issue: BacklogIssue = {
      id: item.id,
      idReadable: item.issueNumber,
      summary: item.summary,
      // Проект и систему не возвращает API — оставляем пустыми,
      // чтобы фронт не падал. Фильтры по ним будут работать через query params.
      projectId: "",
      systemId: "",
      type: "Task" as IssueType, // по умолчанию; бэкенд не отдаёт тип
      priority: "Medium" as Priority,
      state: "Open" as IssueState,
      reporterId: "",
      estimateHours: item.totalPlannedHours,
      readiness: item.readinessPercent,
      spentHours: 0,
      parentIdReadable: item.parentIssueNumber ?? parentIssueNumber ?? undefined,
      parentSummary: undefined,
      parentType: undefined,
      assigneeId: item.assigneeId ?? undefined,
    };

    result.push(issue);

    // Рекурсивно обрабатываем children
    if (item.children && item.children.length > 0) {
      const children = flattenBacklogItems(item.children, item.issueNumber);
      result.push(...children);
    }
  }

  return result;
}

/**
 * Преобразует CapacitySummaryDto в массив Employee[],
 * пригодный для отображения колонок сотрудников во фронте.
 * Использует поля fullName, employeeId.
 * Поле name = fullName, position = "Сотрудник" (не отдаётся API),
 * workRole пока ставим "development" — настоящую роль нужно
 * будет подгрузить из другого эндпоинта.
 */
export function capacityToEmployees(
  capacity: CapacitySummaryDto,
  workRole: WorkRole = "development",
): Employee[] {
  return capacity.employees.map((e) => ({
    id: e.employeeId,
    name: e.fullName ?? "Неизвестный",
    position: "Сотрудник",
    workRole,
    monthlyNetSalary: 0,
    ytLogin: "",
  }));
}

// ============================================================================
// Хук usePlanning
// ============================================================================

// Ключи кэша React Query
export const planningKeys = {
  all: ["planning"] as const,
  periods: () => ["planning", "periods"] as const,
  period: (id: string) => ["planning", "period", id] as const,
  backlog: (periodId: string, filters?: Record<string, unknown>) =>
    ["planning", "backlog", periodId, filters] as const,
  capacity: (periodId: string) => ["planning", "capacity", periodId] as const,
  planVersions: (periodId: string) => ["planning", "planVersions", periodId] as const,
};

export function usePlanning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/planning/periods — список периодов
  // ========================================================================
  const usePeriods = (page = 1, limit = 20) =>
    useQuery({
      queryKey: planningKeys.periods(),
      queryFn: async (): Promise<PaginatedResult<PlanningPeriodDto>> => {
        const response = await api.get<PaginatedResult<PlanningPeriodDto>>(
          `/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`,
        );
        return response;
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/planning/periods/:id — детали периода
  // ========================================================================
  const usePeriodDetail = (periodId: string | null) =>
    useQuery({
      queryKey: planningKeys.period(periodId ?? ""),
      queryFn: async (): Promise<PlanningPeriodDto> => {
        const response = await api.get<PlanningPeriodDto>(
          `/planning/periods/${periodId}`,
        );
        return response;
      },
      enabled: !!periodId,
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/planning/periods/:id/backlog — бэклог с фильтрами
  // ========================================================================
  const useBacklog = (
    periodId: string | null,
    filters?: {
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
    },
  ) =>
    useQuery({
      queryKey: planningKeys.backlog(periodId ?? "", filters ?? {}),
      queryFn: async (): Promise<PaginatedResult<BacklogItemDto>> => {
        if (!periodId) throw new Error("periodId is required");

        const params = new URLSearchParams();
        if (filters) {
          if (filters.system) params.set("system", filters.system);
          if (filters.project) params.set("project", filters.project);
          if (filters.priority) params.set("priority", filters.priority);
          if (filters.type) params.set("type", filters.type);
          if (filters.status) params.set("status", filters.status);
          if (filters.assignee) params.set("assignee", filters.assignee);
          if (filters.reporter) params.set("reporter", filters.reporter);
          if (filters.isPlanned) params.set("isPlanned", filters.isPlanned);
          if (filters.readinessMin !== undefined) params.set("readinessMin", String(filters.readinessMin));
          if (filters.readinessMax !== undefined) params.set("readinessMax", String(filters.readinessMax));
          if (filters.search) params.set("search", filters.search);
          params.set("page", String(filters.page ?? 1));
          params.set("limit", String(filters.limit ?? 100));
        }

        const qs = params.toString();
        const endpoint = `/planning/periods/${periodId}/backlog${qs ? `?${qs}` : ""}`;
        return await api.get<PaginatedResult<BacklogItemDto>>(endpoint);
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/planning/periods/:id/capacity — мощность
  // ========================================================================
  const useCapacity = (periodId: string | null) =>
    useQuery({
      queryKey: planningKeys.capacity(periodId ?? ""),
      queryFn: async (): Promise<CapacitySummaryDto> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<CapacitySummaryDto>(
          `/planning/periods/${periodId}/capacity`,
        );
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // PUT /api/planning/periods/:id/tasks/:taskId — назначение задачи
  // ========================================================================
  const useAssignTask = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        taskId,
        employeeId,
        plannedHours,
      }: {
        periodId: string;
        taskId: string;
        employeeId: string;
        plannedHours: number;
      }): Promise<AssignTaskResultDto> => {
        return await api.put<AssignTaskResultDto>(
          `/planning/periods/${periodId}/tasks/${taskId}`,
          {
            assigneeId: employeeId,
            plannedHours,
          },
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.backlog(variables.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: planningKeys.capacity(variables.periodId),
        });
        toast({
          title: "Задача назначена",
          description: `Задача назначена на сотрудника в период ${variables.periodId}`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка назначения",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // DELETE /api/planning/periods/:id/tasks/:taskId — снятие назначения
  // ========================================================================
  const useUnassignTask = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        taskId,
      }: {
        periodId: string;
        taskId: string;
      }): Promise<UnassignTaskResultDto> => {
        return await api.delete<UnassignTaskResultDto>(
          `/planning/periods/${periodId}/tasks/${taskId}`,
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.backlog(variables.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: planningKeys.capacity(variables.periodId),
        });
        toast({
          title: "Назначение снято",
          description: "Задача снята с исполнителя",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка снятия назначения",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/planning/periods/:id/fix-plan — фиксация плана
  // ========================================================================
  const useFixPlan = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        comment,
      }: {
        periodId: string;
        comment?: string;
      }): Promise<FixPlanResultDto> => {
        return await api.post<FixPlanResultDto>(
          `/planning/periods/${periodId}/fix-plan`,
          comment ? { comment } : undefined,
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.period(variables.periodId),
        });
        toast({
          title: "План зафиксирован",
          description: `План спринта ${variables.periodId} зафиксирован`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка фиксации плана",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // PUT /api/planning/periods/:id — обновление настроек периода
  // ========================================================================
  const useUpdatePeriod = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        ...settings
      }: {
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
      }): Promise<PlanningPeriodDto> => {
        return await api.put<PlanningPeriodDto>(
          `/planning/periods/${periodId}`,
          settings,
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.period(variables.periodId),
        });
        toast({
          title: "Настройки сохранены",
          description: "Настройки периода обновлены",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка сохранения настроек",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // GET /api/planning/periods/:id/plan-versions — версии плана
  // ========================================================================
  const usePlanVersions = (periodId: string | null) =>
    useQuery({
      queryKey: planningKeys.planVersions(periodId ?? ""),
      queryFn: async (): Promise<PlanVersionDto[]> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<PlanVersionDto[]>(
          `/planning/periods/${periodId}/plan-versions`,
        );
      },
      enabled: !!periodId,
      staleTime: 30_000,
    });

  // ========================================================================
  // POST /api/planning/periods/:id/transition — переход состояния
  // ========================================================================
  const useTransitionPeriod = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        transition,
        reason,
      }: {
        periodId: string;
        transition: string;
        reason?: string;
      }): Promise<TransitionResultDto> => {
        return await api.post<TransitionResultDto>(
          `/planning/periods/${periodId}/transition`,
          { transition, reason },
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.period(variables.periodId),
        });
        toast({
          title: "Статус изменён",
          description: `Период ${variables.periodId} переведён в новый статус`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка изменения статуса",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // PUT /api/planning/periods/:id/tasks/:taskId/sort — сортировка
  // ========================================================================
  const useUpdateTaskSort = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        taskId,
        sortOrder,
      }: {
        periodId: string;
        taskId: string;
        sortOrder: number;
      }): Promise<UpdateSortResultDto> => {
        return await api.put<UpdateSortResultDto>(
          `/planning/periods/${periodId}/tasks/${taskId}/sort`,
          { sortOrder },
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.backlog(variables.periodId),
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка сортировки",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // PUT /api/planning/periods/:id/tasks/:taskId/readiness — готовность
  // ========================================================================
  const useUpdateTaskReadiness = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        taskId,
        readinessPercent,
      }: {
        periodId: string;
        taskId: string;
        readinessPercent: number;
      }): Promise<UpdateReadinessResultDto> => {
        return await api.put<UpdateReadinessResultDto>(
          `/planning/periods/${periodId}/tasks/${taskId}/readiness`,
          { readinessPercent },
        );
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: planningKeys.backlog(variables.periodId),
        });
        toast({
          title: "Готовность обновлена",
          description: `Готовность задачи обновлена до ${variables.readinessPercent}%`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка обновления готовности",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // Экспорт хука
  // ========================================================================

  return {
    // Запросы (read)
    usePeriods,
    usePeriodDetail,
    useBacklog,
    useCapacity,
    usePlanVersions,

    // Мутации (write)
    useAssignTask,
    useUnassignTask,
    useFixPlan,
    useUpdatePeriod,
    useTransitionPeriod,
    useUpdateTaskSort,
    useUpdateTaskReadiness,

    // Утилиты
    flattenBacklogItems,
    capacityToEmployees,

    // Ключи кэша для ручной инвалидации
    planningKeys,
    queryClient,
  };
}
