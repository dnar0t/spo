/**
 * useReports — хук для взаимодействия с backend API модуля отчетов.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - сводный отчёт периода (summary)
 * - личный отчёт (personal/me и personal/:userId)
 * - статистика периода
 * - оценки руководителя (создание / обновление)
 * - оценки бизнеса (создание / обновление)
 * - пересчёт отчётов периода
 * - периоды (из планирования)
 * - пользователи (из администрирования)
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

/** Строка личного отчёта (задача) */
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

/** Итоги личного отчёта */
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

/** Личный отчёт сотрудника */
export interface PersonalReportDto {
  userId: string;
  fullName: string | null;
  periodId: string;
  lines: PersonalReportLineDto[];
  totals: PersonalReportTotalsDto;
}

/** Строка сводного отчёта */
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

/** Группа сводного отчёта */
export interface GroupedReportDto {
  systemName: string;
  plannedHours: number;
  actualHours: number;
  items: SummaryReportLineDto[];
}

/** Статистика сводного отчёта */
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

/** Период сводного отчёта */
export interface SummaryPeriodInfo {
  id: string;
  month: number;
  year: number;
  state: string;
}

/** Сводный отчёт периода */
export interface SummaryReportDto {
  period: SummaryPeriodInfo;
  statistics: SummaryReportStatistics;
  groups: GroupedReportDto[];
  page: number;
  pageSize: number;
  total: number;
}

/** Статистика периода */
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

/** Параметры фильтрации сводного отчёта */
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

/** Создание оценки руководителя */
export interface CreateManagerEvaluationDto {
  periodId: string;
  youtrackIssueId: string;
  userId: string;
  evaluationType: string;
  percent: number;
  comment?: string;
}

/** Обновление оценки руководителя */
export interface UpdateManagerEvaluationDto {
  evaluationType?: string;
  percent?: number;
  comment?: string;
}

/** Создание оценки бизнеса */
export interface CreateBusinessEvaluationDto {
  periodId: string;
  youtrackIssueId: string;
  evaluationType: string;
  percent: number;
  comment?: string;
}

/** Обновление оценки бизнеса */
export interface UpdateBusinessEvaluationDto {
  evaluationType?: string;
  percent?: number;
  comment?: string;
}

/** Период планирования */
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

/** Пользователь из администрирования */
export interface AdminUserDto {
  id: string;
  login: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
  isActive: boolean;
}

/** Пагинированный ответ */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================

// Ключи кэша React Query
export const reportingKeys = {
  all: ['reporting'] as const,
  summary: (periodId: string, filters?: Record<string, unknown>) =>
    ['reporting', 'summary', periodId, filters] as const,
  personal: (periodId: string, userId: string) =>
    ['reporting', 'personal', periodId, userId] as const,
  statistics: (periodId: string) => ['reporting', 'statistics', periodId] as const,
  periodsList: () => ['reporting', 'periodsList'] as const,
  employeesList: () => ['reporting', 'employeesList'] as const,
};

export function useReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/planning/periods — список периодов
  // ========================================================================
  const usePeriods = (page = 1, limit = 60) =>
    useQuery({
      queryKey: reportingKeys.periodsList(),
      queryFn: async (): Promise<PlanningPeriodDto[]> => {
        const response = await api.get<{ data: PlanningPeriodDto[] }>(
          `/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`,
        );
        // ответ может быть пагинированным { data, total, ... } или массивом
        if (Array.isArray(response)) return response;
        return (response as PaginatedResult<PlanningPeriodDto>).data ?? [];
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/admin/users — список сотрудников (для селектора)
  // ========================================================================
  const useEmployees = (search?: string) =>
    useQuery({
      queryKey: reportingKeys.employeesList(),
      queryFn: async (): Promise<AdminUserDto[]> => {
        const params = new URLSearchParams();
        params.set('limit', '100');
        if (search) params.set('search', search);
        const response = await api.get<{ items: AdminUserDto[] }>(
          `/admin/users?${params.toString()}`,
        );
        return response.items ?? [];
      },
      staleTime: 30_000,
    });

  // ========================================================================
  // GET /api/reporting/periods/:id/summary — итоговый отчёт периода
  // ========================================================================
  const useSummaryReport = (periodId: string | null, filters?: SummaryReportFilters) =>
    useQuery({
      queryKey: reportingKeys.summary(periodId ?? '', filters ?? {}),
      queryFn: async (): Promise<SummaryReportDto> => {
        if (!periodId) throw new Error('periodId is required');

        const params = new URLSearchParams();
        if (filters) {
          if (filters.system) params.set('system', filters.system);
          if (filters.groupBy) params.set('groupBy', filters.groupBy);
          if (filters.isPlanned) params.set('isPlanned', filters.isPlanned);
          if (filters.search) params.set('search', filters.search);
          if (filters.sortField) params.set('sortField', filters.sortField);
          if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
          params.set('page', String(filters.page ?? 1));
          params.set('pageSize', String(filters.pageSize ?? 50));
        }

        const qs = params.toString();
        const endpoint = `/reporting/periods/${periodId}/summary${qs ? `?${qs}` : ''}`;
        return await api.get<SummaryReportDto>(endpoint);
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/reporting/periods/:id/personal/me — свой личный отчёт
  // ========================================================================
  const usePersonalReport = (periodId: string | null, userId: string | null) =>
    useQuery({
      queryKey: reportingKeys.personal(periodId ?? '', userId ?? 'me'),
      queryFn: async (): Promise<PersonalReportDto> => {
        if (!periodId) throw new Error('periodId is required');

        // Если userId указан и не равен "me" — запрашиваем конкретного сотрудника
        const endpoint = userId
          ? `/reporting/periods/${periodId}/personal/${userId}`
          : `/reporting/periods/${periodId}/personal/me`;

        return await api.get<PersonalReportDto>(endpoint);
      },
      enabled: !!periodId,
      staleTime: 15_000,
      retry: 1,
    });

  // ========================================================================
  // GET /api/reporting/periods/:id/statistics — статистика периода
  // ========================================================================
  const usePeriodStatistics = (periodId: string | null) =>
    useQuery({
      queryKey: reportingKeys.statistics(periodId ?? ''),
      queryFn: async (): Promise<PeriodStatisticsDto> => {
        if (!periodId) throw new Error('periodId is required');
        return await api.get<PeriodStatisticsDto>(`/reporting/periods/${periodId}/statistics`);
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // POST /api/reporting/evaluations/manager — создание оценки руководителя
  // PUT /api/reporting/evaluations/manager/:id — обновление оценки руководителя
  // ========================================================================
  const useSubmitManagerEvaluation = () =>
    useMutation({
      mutationFn: async ({
        evaluationId,
        periodId,
        youtrackIssueId,
        userId,
        evaluationType,
        percent,
        comment,
      }: {
        evaluationId?: string;
        periodId: string;
        youtrackIssueId: string;
        userId: string;
        evaluationType: string;
        percent: number;
        comment?: string;
      }): Promise<{ id: string }> => {
        if (evaluationId) {
          // Обновление существующей оценки
          return await api.put<{ id: string }>(`/reporting/evaluations/manager/${evaluationId}`, {
            evaluationType,
            percent,
            comment,
          });
        }
        // Создание новой оценки
        return await api.post<{ id: string }>('/reporting/evaluations/manager', {
          periodId,
          youtrackIssueId,
          userId,
          evaluationType,
          percent,
          comment,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: reportingKeys.all,
        });
        toast({
          title: 'Оценка руководителя сохранена',
          description: 'Оценка успешно отправлена.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка при сохранении оценки руководителя',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // POST /api/reporting/evaluations/business — создание оценки бизнеса
  // PUT /api/reporting/evaluations/business/:id — обновление оценки бизнеса
  // ========================================================================
  const useSubmitBusinessEvaluation = () =>
    useMutation({
      mutationFn: async ({
        evaluationId,
        periodId,
        youtrackIssueId,
        evaluationType,
        percent,
        comment,
      }: {
        evaluationId?: string;
        periodId: string;
        youtrackIssueId: string;
        evaluationType: string;
        percent: number;
        comment?: string;
      }): Promise<{ id: string }> => {
        if (evaluationId) {
          // Обновление существующей оценки
          return await api.put<{ id: string }>(`/reporting/evaluations/business/${evaluationId}`, {
            evaluationType,
            percent,
            comment,
          });
        }
        // Создание новой оценки
        return await api.post<{ id: string }>('/reporting/evaluations/business', {
          periodId,
          youtrackIssueId,
          evaluationType,
          percent,
          comment,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: reportingKeys.all,
        });
        toast({
          title: 'Оценка бизнеса сохранена',
          description: 'Оценка успешно отправлена.',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка при сохранении оценки бизнеса',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // POST /api/reporting/periods/:id/recalculate — пересчёт отчётов
  // ========================================================================
  const useRecalculateReports = () =>
    useMutation({
      mutationFn: async (
        periodId: string,
      ): Promise<{
        personalReportsGenerated: number;
        summaryReportsGenerated: number;
      }> => {
        return await api.post<{
          personalReportsGenerated: number;
          summaryReportsGenerated: number;
        }>(`/reporting/periods/${periodId}/recalculate`);
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: reportingKeys.all,
        });
        toast({
          title: 'Отчёты пересчитаны',
          description: `Сформировано личных отчётов: ${data.personalReportsGenerated}, сводных: ${data.summaryReportsGenerated}.`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'Ошибка пересчёта отчётов',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

  // ========================================================================
  // Вспомогательная: получить период по ключу "YYYY-MM"
  // ========================================================================
  const findPeriodByKey = (
    periods: PlanningPeriodDto[],
    periodKey: string,
  ): PlanningPeriodDto | undefined => {
    const [yearStr, monthStr] = periodKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    return periods.find((p) => p.year === year && p.month === month);
  };

  // ========================================================================
  // Формирование опций для селектора периода
  // ========================================================================
  const buildPeriodOptions = (
    periods: PlanningPeriodDto[],
  ): { value: string; label: string; year: number; month: number }[] => {
    return periods
      .map((p) => ({
        value: `${p.year}-${String(p.month).padStart(2, '0')}`,
        label: `${monthsRu[p.month - 1]} ${p.year}`,
        year: p.year,
        month: p.month,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  };

  return {
    // Запросы
    usePeriods,
    useEmployees,
    useSummaryReport,
    usePersonalReport,
    usePeriodStatistics,
    useSubmitManagerEvaluation,
    useSubmitBusinessEvaluation,
    useRecalculateReports,
    // Вспомогательные
    findPeriodByKey,
    buildPeriodOptions,
    // Ключи
    keys: reportingKeys,
  };
}

/** Русские названия месяцев */
const monthsRu = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
