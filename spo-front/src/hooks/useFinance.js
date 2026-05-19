"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFinance = useFinance;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
const financeKeys = {
    all: ["finance"],
    groups: (periodId) => ["finance", "groups", periodId],
    byProject: (periodId) => ["finance", "byProject", periodId],
    bySystem: (periodId) => ["finance", "bySystem", periodId],
    totals: (periodId) => ["finance", "totals", periodId],
};
function toIssueContribution(dto) {
    return {
        employeeId: dto.employeeId,
        employeeName: dto.employeeName,
        minutes: dto.minutes,
        managerGrade: dto.managerGrade,
        baseRateKop: dto.baseRateKop,
    };
}
function toIssueLine(dto) {
    return {
        idReadable: dto.idReadable,
        summary: dto.summary,
        type: dto.type,
        projectId: dto.projectId,
        projectShort: dto.projectShort,
        systemId: dto.systemId,
        systemName: dto.systemName,
        parentIdReadable: dto.parentIdReadable,
        parentSummary: dto.parentSummary,
        parentType: dto.parentType,
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
function toIssueGroup(dto) {
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
function toSystemBucket(dto) {
    return {
        systemId: dto.systemId,
        systemName: dto.systemName,
        groups: [],
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
function useFinance() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const usePeriods = (page = 1, limit = 20) => (0, react_query_1.useQuery)({
        queryKey: ["planning", "periods"],
        queryFn: async () => {
            const response = await api_1.api.get(`/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`);
            return response;
        },
        staleTime: 30_000,
    });
    const useFinanceGroups = (periodId) => (0, react_query_1.useQuery)({
        queryKey: financeKeys.groups(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            const response = await api_1.api.get(`/finance/periods/${periodId}/groups`);
            return response.map(toIssueGroup);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useFinanceByProject = (periodId) => (0, react_query_1.useQuery)({
        queryKey: financeKeys.byProject(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            const response = await api_1.api.get(`/finance/periods/${periodId}/by-project`);
            return response;
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useFinanceBySystem = (periodId) => (0, react_query_1.useQuery)({
        queryKey: financeKeys.bySystem(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            const response = await api_1.api.get(`/finance/periods/${periodId}/by-system`);
            return response;
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useFinanceTotals = (periodId) => (0, react_query_1.useQuery)({
        queryKey: financeKeys.totals(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            const response = await api_1.api.get(`/finance/periods/${periodId}/totals`);
            return response;
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useFreezeFinancials = () => (0, react_query_1.useMutation)({
        mutationFn: async (periodId) => {
            const response = await api_1.api.post(`/finance/periods/${periodId}/freeze`);
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
        onError: (error) => {
            toast({
                title: "Ошибка заморозки",
                description: error.message || "Не удалось заморозить финансовые данные.",
                variant: "destructive",
            });
        },
    });
    const findPeriodByKey = (periods, key) => {
        const [yearStr, monthStr] = key.split("-");
        const year = Number(yearStr);
        const month = Number(monthStr);
        return periods.find((p) => p.year === year && p.month === month);
    };
    const buildPeriodOptions = (periods) => {
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
//# sourceMappingURL=useFinance.js.map