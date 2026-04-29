/**
 * useTimesheets — хук для взаимодействия с backend API модуля табелей.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - получение своего табеля
 * - получение табелей команды
 * - CRUD операций над строками
 * - переходы по статусам
 *
 * Использует api-клиент из @/lib/api.
 * Возвращает React Query-хуки для использования в компонентах.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Типы ответов API (согласно backend-контроллеру timesheet.controller.ts)
// ============================================================================

export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "manager_approved"
  | "approved"
  | "rejected";

export type TimesheetRowSource = "plan" | "worklog";

export type TimesheetRowGrade = "none" | "low" | "medium" | "high" | "critical";

export type TimesheetRowBusinessGrade =
  | "none"
  | "no_benefit"
  | "direct"
  | "obvious";

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

/** Элемент бэклога (задача) из API */
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

/** Проект из справочника */
export interface ProjectDto {
  id: string;
  shortName: string;
  name: string;
}

/** Система из справочника */
export interface SystemDto {
  id: string;
  name: string;
}

/** Сотрудник с оргструктурой */
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

// ============================================================================
// Query keys
// ============================================================================

const timesheetKeys = {
  all: ["timesheets"] as const,
  mine: (year: number, month: number) =>
    ["timesheets", "mine", year, month] as const,
  team: (year: number, month: number) =>
    ["timesheets", "team", year, month] as const,
  history: (id: string) => ["timesheets", "history", id] as const,
};

// ============================================================================
// Хук
// ============================================================================

export function useTimesheets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/timesheets/mine?year=&month=
  // ========================================================================
  const useMyTimesheet = (year: number, month: number) =>
    useQuery({
      queryKey: timesheetKeys.mine(year, month),
      queryFn: async (): Promise<TimesheetDto | null> => {
        const response = await api.get<TimesheetDto | null>(
          `/timesheets/mine?year=${year}&month=${month}`,
        );
        return response;
      },
      staleTime: 10_000,
    });

  // ========================================================================
  // GET /api/timesheets/team?year=&month=&employeeIds=
  // ========================================================================
  const useTeamTimesheets = (year: number, month: number, employeeIds: string[]) =>
    useQuery({
      queryKey: timesheetKeys.team(year, month),
      queryFn: async (): Promise<TimesheetDto[]> => {
        const ids = employeeIds.join(",");
        const response = await api.get<TimesheetDto[]>(
          `/timesheets/team?year=${year}&month=${month}&employeeIds=${ids}`,
        );
        return response;
      },
      enabled: employeeIds.length > 0,
      staleTime: 10_000,
    });

  // ========================================================================
  // GET /api/timesheets/:id/history
  // ========================================================================
  const useTimesheetHistory = (id: string | null) =>
    useQuery({
      queryKey: timesheetKeys.history(id ?? ""),
      queryFn: async (): Promise<TimesheetStatusTransitionDto[]> => {
        if (!id) throw new Error("timesheet id is required");
        const response = await api.get<TimesheetStatusTransitionDto[]>(
          `/timesheets/${id}/history`,
        );
        return response;
      },
      enabled: !!id,
      staleTime: 30_000,
    });

  // ========================================================================
  // PUT /api/timesheets/:id/rows/:rowId
  // ========================================================================
  const useUpdateRow = () =>
    useMutation({
      mutationFn: async ({
        timesheetId,
        rowId,
        ...data
      }: {
        timesheetId: string;
        rowId: string;
        minutes?: number;
        managerGrade?: TimesheetRowGrade;
        businessGrade?: TimesheetRowBusinessGrade;
      }): Promise<TimesheetDto> => {
        const response = await api.put<TimesheetDto>(
          `/timesheets/${timesheetId}/rows/${rowId}`,
          data,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка обновления строки",
          description: error.message || "Не удалось обновить строку табеля.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/rows
  // ========================================================================
  const useAddRow = () =>
    useMutation({
      mutationFn: async ({
        timesheetId,
        ...data
      }: {
        timesheetId: string;
        issueIdReadable: string;
        minutes: number;
      }): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/rows`,
          data,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка добавления строки",
          description: error.message || "Не удалось добавить строку в табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // DELETE /api/timesheets/:id/rows/:rowId
  // ========================================================================
  const useDeleteRow = () =>
    useMutation({
      mutationFn: async ({
        timesheetId,
        rowId,
      }: {
        timesheetId: string;
        rowId: string;
      }): Promise<void> => {
        await api.delete(`/timesheets/${timesheetId}/rows/${rowId}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка удаления строки",
          description: error.message || "Не удалось удалить строку из табеля.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/submit
  // ========================================================================
  const useSubmit = () =>
    useMutation({
      mutationFn: async (timesheetId: string): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/submit`,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        toast({
          title: "Табель отправлен",
          description: "Табель направлен на согласование руководителю.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка отправки",
          description: error.message || "Не удалось отправить табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/recall
  // ========================================================================
  const useRecall = () =>
    useMutation({
      mutationFn: async (timesheetId: string): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/recall`,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        toast({
          title: "Табель отозван",
          description: "Табель возвращён в статус черновика.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка отзыва",
          description: error.message || "Не удалось отозвать табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/manager-approve
  // ========================================================================
  const useManagerApprove = () =>
    useMutation({
      mutationFn: async (timesheetId: string): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/manager-approve`,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        toast({
          title: "Табель согласован",
          description: "Табель направлен на утверждение директору.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка согласования",
          description: error.message || "Не удалось согласовать табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/director-approve
  // ========================================================================
  const useDirectorApprove = () =>
    useMutation({
      mutationFn: async (timesheetId: string): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/director-approve`,
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        toast({
          title: "Табель утверждён",
          description: "Табель окончательно утверждён.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка утверждения",
          description: error.message || "Не удалось утвердить табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/timesheets/:id/reject
  // ========================================================================
  const useReject = () =>
    useMutation({
      mutationFn: async ({
        timesheetId,
        comment,
      }: {
        timesheetId: string;
        comment: string;
      }): Promise<TimesheetDto> => {
        const response = await api.post<TimesheetDto>(
          `/timesheets/${timesheetId}/reject`,
          { comment },
        );
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        toast({
          title: "Табель отклонён",
          description: "Табель возвращён сотруднику на доработку.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка отклонения",
          description: error.message || "Не удалось отклонить табель.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // GET /api/planning/periods — список периодов (для селектора месяца/года)
  // ========================================================================
  const usePeriods = (page = 1, limit = 20) =>
    useQuery({
      queryKey: ["planning", "periods"],
      queryFn: async (): Promise<PaginatedResult<PlanningPeriodDto>> => {
        const response = await api.get<PaginatedResult<PlanningPeriodDto>>(
          `/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`,
        );
        return response;
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/planning/backlog — бэклог (для поиска задач при добавлении строки)
  // ========================================================================
  const useBacklog = (params?: {
    search?: string;
    isPlanned?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const { search, isPlanned, page = 1, limit = 50 } = params ?? {};
    return useQuery({
      queryKey: ["planning", "backlog", { search, isPlanned, page, limit }],
      queryFn: async (): Promise<PaginatedResult<BacklogItemDto>> => {
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        if (search) qs.set("search", search);
        if (isPlanned !== undefined) qs.set("isPlanned", String(isPlanned));
        const response = await api.get<PaginatedResult<BacklogItemDto>>(
          `/planning/backlog?${qs.toString()}`,
        );
        return response;
      },
      staleTime: 15_000,
    });
  };

  // ========================================================================
  // GET /api/admin/dictionaries — справочники (проекты, системы)
  // ========================================================================
  const useDictionaries = () =>
    useQuery({
      queryKey: ["admin", "dictionaries"],
      queryFn: async (): Promise<{
        workRoles: { id: string; name: string; label: string }[];
        evaluationScales: string[];
        projects: ProjectDto[];
        systems: SystemDto[];
      }> => {
        const response = await api.get<{
          workRoles: { id: string; name: string; label: string }[];
          evaluationScales: string[];
          projects: ProjectDto[];
          systems: SystemDto[];
        }>("/admin/dictionaries");
        return response;
      },
      staleTime: 60_000,
    });

  return {
    useMyTimesheet,
    useTeamTimesheets,
    useTimesheetHistory,
    useUpdateRow,
    useAddRow,
    useDeleteRow,
    useSubmit,
    useRecall,
    useManagerApprove,
    useDirectorApprove,
    useReject,
    usePeriods,
    useBacklog,
    useDictionaries,
  };
}
