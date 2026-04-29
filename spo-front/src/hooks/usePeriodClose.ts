/**
 * usePeriodClose — хук для взаимодействия с backend API модуля закрытия периода.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - список периодов
 * - чек-лист готовности
 * - закрытие / переоткрытие периода
 * - статус снэпшота / данные снэпшота
 * - статистика периода
 *
 * Использует api-клиент из @/lib/api.
 * Возвращает React Query-хуки для использования в компонентах.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { PlanningPeriodDto, PaginatedResult } from "@/hooks/usePlanning";
import type { PeriodStatisticsDto } from "@/hooks/useReports";

// ============================================================================
// Типы ответов API (согласно backend-контроллеру period-closing.controller)
// ============================================================================

/** Статус элемента чек-листа */
export type ChecklistItemStatus = "ok" | "warn" | "fail";

/** Элемент чек-листа готовности */
export interface ChecklistItemDto {
  id: string;
  label: string;
  description: string;
  status: ChecklistItemStatus;
  detail?: string;
  /** Кол-во проблемных сущностей (для бейджа) */
  problemCount?: number;
  /** Какие сотрудники не прошли проверку */
  problemEmployeeIds?: string[];
  /** Блокирующее ли требование */
  blocking: boolean;
}

/** Чек-лист готовности из GET /api/periods/:id/readiness */
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

/** Результат закрытия периода */
export interface ClosePeriodResultDto {
  periodId: string;
  previousState: string;
  currentState: string;
  closedAt: string;
  snapshotId: string;
}

/** Результат переоткрытия периода */
export interface ReopenPeriodResultDto {
  periodId: string;
  previousState: string;
  currentState: string;
  reopenedAt: string;
  reopenReason: string;
}

/** Статус снэпшота из GET /api/periods/:id/snapshot/status */
export interface SnapshotStatusDto {
  periodId: string;
  hasSnapshot: boolean;
  snapshotId: string | null;
  createdAt: string | null;
}

/** Данные снэпшота из GET /api/periods/:id/snapshot */
export interface SnapshotDto {
  id: string;
  periodId: string;
  createdAt: string;
  // Остальные поля снэпшота (агрегаты, строки отчёта и т.д.)
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

// ============================================================================
// Ключи кэша React Query
// ============================================================================
export const periodCloseKeys = {
  all: ["periodClose"] as const,
  periods: () => ["periodClose", "periods"] as const,
  readiness: (periodId: string) => ["periodClose", "readiness", periodId] as const,
  snapshot: (periodId: string) => ["periodClose", "snapshot", periodId] as const,
  snapshotStatus: (periodId: string) =>
    ["periodClose", "snapshotStatus", periodId] as const,
  statistics: (periodId: string) => ["periodClose", "statistics", periodId] as const,
};

/**
 * usePeriodClose — основной хук модуля закрытия периода.
 * Возвращает набор вложенных хуков для запросов/мутаций.
 */
export function usePeriodClose() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/planning/periods — список периодов
  // ========================================================================
  const usePeriods = (page = 1, limit = 50) =>
    useQuery({
      queryKey: periodCloseKeys.periods(),
      queryFn: async (): Promise<PaginatedResult<PlanningPeriodDto>> => {
        return await api.get<PaginatedResult<PlanningPeriodDto>>(
          `/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`,
        );
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/periods/:id/readiness — чек-лист готовности
  // ========================================================================
  const usePeriodReadiness = (periodId: string | null) =>
    useQuery({
      queryKey: periodCloseKeys.readiness(periodId ?? ""),
      queryFn: async (): Promise<PeriodReadinessDto> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<PeriodReadinessDto>(`/periods/${periodId}/readiness`);
      },
      enabled: !!periodId,
      staleTime: 10_000,
      retry: 1,
    });

  // ========================================================================
  // POST /api/periods/:id/close — закрытие периода
  // ========================================================================
  const useClosePeriod = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        reason,
      }: {
        periodId: string;
        reason?: string;
      }): Promise<ClosePeriodResultDto> => {
        return await api.post<ClosePeriodResultDto>(`/periods/${periodId}/close`, {
          reason,
        });
      },
      onSuccess: (data) => {
        // Инвалидируем связанные кэши
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.readiness(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.snapshotStatus(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.snapshot(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.periods(),
        });
        toast({
          title: "Период закрыт",
          description: `Создан immutable snapshot · ${data.snapshotId}`,
        });
      },
      onError: (error) => {
        toast({
          title: "Ошибка закрытия",
          description:
            error instanceof Error ? error.message : "Не удалось закрыть период",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // POST /api/periods/:id/reopen — переоткрытие периода
  // ========================================================================
  const useReopenPeriod = () =>
    useMutation({
      mutationFn: async ({
        periodId,
        reason,
      }: {
        periodId: string;
        reason: string;
      }): Promise<ReopenPeriodResultDto> => {
        return await api.post<ReopenPeriodResultDto>(`/periods/${periodId}/reopen`, {
          reason,
        });
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.readiness(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.snapshotStatus(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.snapshot(data.periodId),
        });
        queryClient.invalidateQueries({
          queryKey: periodCloseKeys.periods(),
        });
        toast({
          title: "Период переоткрыт",
          description: `Действие зафиксировано в аудите · ${data.reopenReason}`,
        });
      },
      onError: (error) => {
        toast({
          title: "Ошибка переоткрытия",
          description:
            error instanceof Error ? error.message : "Не удалось переоткрыть период",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // GET /api/periods/:id/snapshot/status — статус снэпшота
  // ========================================================================
  const useSnapshotStatus = (periodId: string | null) =>
    useQuery({
      queryKey: periodCloseKeys.snapshotStatus(periodId ?? ""),
      queryFn: async (): Promise<SnapshotStatusDto> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<SnapshotStatusDto>(
          `/periods/${periodId}/snapshot/status`,
        );
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/periods/:id/snapshot — данные снэпшота
  // ========================================================================
  const useSnapshot = (periodId: string | null) =>
    useQuery({
      queryKey: periodCloseKeys.snapshot(periodId ?? ""),
      queryFn: async (): Promise<SnapshotDto> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<SnapshotDto>(`/periods/${periodId}/snapshot`);
      },
      enabled: !!periodId,
      staleTime: 30_000,
      retry: 1,
    });

  // ========================================================================
  // GET /api/reporting/periods/:id/statistics — статистика периода
  // ========================================================================
  const usePeriodStatistics = (periodId: string | null) =>
    useQuery({
      queryKey: periodCloseKeys.statistics(periodId ?? ""),
      queryFn: async (): Promise<PeriodStatisticsDto> => {
        if (!periodId) throw new Error("periodId is required");
        return await api.get<PeriodStatisticsDto>(
          `/reporting/periods/${periodId}/statistics`,
        );
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // Возвращаем всё как единый объект
  // ========================================================================
  return {
    usePeriods,
    usePeriodReadiness,
    useClosePeriod,
    useReopenPeriod,
    useSnapshotStatus,
    useSnapshot,
    usePeriodStatistics,
    periodCloseKeys,
    queryClient,
  };
}
