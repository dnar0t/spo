/**
 * useFinance — хук для взаимодействия с backend API модуля финансов.
 *
 * Инкапсулирует все запросы к API через @tanstack/react-query:
 * - периоды (список)
 * - финансовые группы (дерево историй с данными по задачам)
 * - данные по проектам
 * - данные по системам
 * - итоги периода
 * - заморозка финансовых данных
 *
 * Использует api-клиент из @/lib/api.
 * Возвращает React Query-хуки для использования в компонентах.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type {
  IssueGroup,
  IssueLine,
  IssueContribution,
  FinanceTotals,
  SystemBucket,
} from "@/lib/finance";

// ============================================================================
// Типы ответов API (согласно backend-контроллеру)
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

/** Финансовая группа (story с подзадачами) из GET /api/finance/periods/:id/groups */
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

/** Строка задачи из API */
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

/** Вклад сотрудника из API */
export interface IssueContributionDto {
  employeeId: string;
  employeeName: string;
  minutes: number;
  managerGrade: string;
  baseRateKop: number;
}

/** Итоги по проекту из GET /api/finance/periods/:id/by-project */
export interface ProjectFinanceDto {
  projectId: string;
  projectShort: string;
  projectName: string;
  totals: FinanceTotalsDto;
}

/** Итоги по проекту из GET /api/finance/periods/:id/by-system */
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

/** Финансовые итоги из GET /api/finance/periods/:id/totals */
export interface FinanceTotalsDto {
  totalPlannedCost: number;
  totalFactCost: number;
  totalSalary: number;
  totalTaxes: number;
  totalCost: number;
}

/** Ответ заморозки */
export interface FreezeResultDto {
  success: boolean;
  message: string;
  periodId: string;
}

// ============================================================================
// Query keys
// ============================================================================

const financeKeys = {
  all: ["finance"] as const,
  groups: (periodId: string) => ["finance", "groups", periodId] as const,
  byProject: (periodId: string) => ["finance", "byProject", periodId] as const,
  bySystem: (periodId: string) => ["finance", "bySystem", periodId] as const,
  totals: (periodId: string) => ["finance", "totals", periodId] as const,
};

// ============================================================================
// Преобразователи DTO -> доменные типы
// ============================================================================

function toIssueContribution(dto: IssueContributionDto): IssueContribution {
  return {
    employeeId: dto.employeeId,
    employeeName: dto.employeeName,
    minutes: dto.minutes,
    managerGrade: dto.managerGrade as IssueContribution["managerGrade"],
    baseRateKop: dto.baseRateKop,
  };
}

function toIssueLine(dto: IssueLineDto): IssueLine {
  return {
    idReadable: dto.idReadable,
    summary: dto.summary,
    type: dto.type as IssueLine["type"],
    projectId: dto.projectId,
    projectShort: dto.projectShort,
    systemId: dto.systemId,
    systemName: dto.systemName,
    parentIdReadable: dto.parentIdReadable,
    parentSummary: dto.parentSummary,
    parentType: dto.parentType as IssueLine["parentType"],
    groupKey: dto.groupKey,
    isGradable: dto.isGradable,
    estimateHours: dto.estimateHours,
    spentHoursPrior: dto.spentHoursPrior,
    minutesThisPeriod: dto.minutesThisPeriod,
    baseSumKop: dto.baseSumKop,
    managerSumKop: dto.managerSumKop,
    contributions: dto.contributions.map(toIssueContribution),
    inPlan: dto.inPlan,
    hasWorklog: dto.hasWorklog,
  };
}

function toIssueGroup(dto: FinanceGroupDto): IssueGroup {
  return {
    key: dto.key,
    head: toIssueLine(dto.head),
    children: dto.children.map(toIssueLine),
    totalMinutes: dto.totalMinutes,
    estimateHours: dto.estimateHours,
    spentHoursPrior: dto.spentHoursPrior,
    baseSumKop: dto.baseSumKop,
    managerSumKop: dto.managerSumKop,
    readinessAtStart: dto.readinessAtStart,
    readinessPlan: dto.readinessPlan,
    plannedHours: dto.plannedHours,
    plannedCostKop: dto.plannedCostKop,
  };
}

function toSystemBucket(dto: SystemFinanceDto): SystemBucket {
  return {
    systemId: dto.systemId,
    systemName: dto.systemName,
    groups: [], // groups will be populated from the groups endpoint
    totalMinutes: dto.totalMinutes,
    plannedCostKop: dto.plannedCostKop,
    factCostKop: dto.factCostKop,
    baseSumKop: dto.baseSumKop,
    managerSumKop: dto.managerSumKop,
    businessSumKop: dto.businessSumKop,
    readinessAtStartAvg: dto.readinessAtStartAvg,
    readinessPlanAvg: dto.readinessPlanAvg,
    readinessFactAvg: dto.readinessFactAvg,
  };
}

// ============================================================================
// Хук
// ============================================================================

export function useFinance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ========================================================================
  // GET /api/planning/periods — список периодов
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
  // GET /api/finance/periods/:id/groups — группы (дерево историй)
  // ========================================================================
  const useFinanceGroups = (periodId: string | null) =>
    useQuery({
      queryKey: financeKeys.groups(periodId ?? ""),
      queryFn: async (): Promise<IssueGroup[]> => {
        if (!periodId) throw new Error("periodId is required");
        const response = await api.get<FinanceGroupDto[]>(
          `/finance/periods/${periodId}/groups`,
        );
        return response.map(toIssueGroup);
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/finance/periods/:id/by-project — по проектам
  // ========================================================================
  const useFinanceByProject = (periodId: string | null) =>
    useQuery({
      queryKey: financeKeys.byProject(periodId ?? ""),
      queryFn: async (): Promise<ProjectFinanceDto[]> => {
        if (!periodId) throw new Error("periodId is required");
        const response = await api.get<ProjectFinanceDto[]>(
          `/finance/periods/${periodId}/by-project`,
        );
        return response;
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/finance/periods/:id/by-system — по системам
  // ========================================================================
  const useFinanceBySystem = (periodId: string | null) =>
    useQuery({
      queryKey: financeKeys.bySystem(periodId ?? ""),
      queryFn: async (): Promise<SystemFinanceDto[]> => {
        if (!periodId) throw new Error("periodId is required");
        const response = await api.get<SystemFinanceDto[]>(
          `/finance/periods/${periodId}/by-system`,
        );
        return response;
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // GET /api/finance/periods/:id/totals — итоги периода
  // ========================================================================
  const useFinanceTotals = (periodId: string | null) =>
    useQuery({
      queryKey: financeKeys.totals(periodId ?? ""),
      queryFn: async (): Promise<FinanceTotalsDto> => {
        if (!periodId) throw new Error("periodId is required");
        const response = await api.get<FinanceTotalsDto>(
          `/finance/periods/${periodId}/totals`,
        );
        return response;
      },
      enabled: !!periodId,
      staleTime: 15_000,
    });

  // ========================================================================
  // POST /api/finance/periods/:id/freeze — заморозка финансов
  // ========================================================================
  const useFreezeFinancials = () =>
    useMutation({
      mutationFn: async (periodId: string): Promise<FreezeResultDto> => {
        const response = await api.post<FreezeResultDto>(
          `/finance/periods/${periodId}/freeze`,
        );
        return response;
      },
      onSuccess: (data, periodId) => {
        queryClient.invalidateQueries({ queryKey: financeKeys.all });
        queryClient.invalidateQueries({ queryKey: financeKeys.totals(periodId) });
        toast({
          title: "Финансовые данные заморожены",
          description: data.message || "Период успешно заморожен.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Ошибка заморозки",
          description: error.message || "Не удалось заморозить финансовые данные.",
          variant: "destructive",
        });
      },
    });

  // ========================================================================
  // Утилита: найти период по ключу "YYYY-MM"
  // ========================================================================
  const findPeriodByKey = (
    periods: PlanningPeriodDto[],
    key: string,
  ): PlanningPeriodDto | undefined => {
    const [yearStr, monthStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    return periods.find((p) => p.year === year && p.month === month);
  };

  // ========================================================================
  // Утилита: построить опции для селектора периодов
  // ========================================================================
  const buildPeriodOptions = (
    periods: PlanningPeriodDto[],
  ): { value: string; label: string; year: number; month: number }[] => {
    return periods
      .map((p) => ({
        value: `${p.year}-${String(p.month).padStart(2, "0")}`,
        label: `${MONTHS_RU[p.month - 1]} ${p.year}`,
        year: p.year,
        month: p.month,
      }))
      .sort((a, b) => b.year - a.year || b.month - a.month);
  };

  return {
    usePeriods,
    useFinanceGroups,
    useFinanceByProject,
    useFinanceBySystem,
    useFinanceTotals,
    useFreezeFinancials,
    findPeriodByKey,
    buildPeriodOptions,
  };
}

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
