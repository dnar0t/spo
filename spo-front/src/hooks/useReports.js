"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportingKeys = void 0;
exports.useReports = useReports;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
exports.reportingKeys = {
    all: ['reporting'],
    summary: (periodId, filters) => ['reporting', 'summary', periodId, filters],
    personal: (periodId, userId) => ['reporting', 'personal', periodId, userId],
    statistics: (periodId) => ['reporting', 'statistics', periodId],
    periodsList: () => ['reporting', 'periodsList'],
    employeesList: () => ['reporting', 'employeesList'],
};
function useReports() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const usePeriods = (page = 1, limit = 60) => (0, react_query_1.useQuery)({
        queryKey: exports.reportingKeys.periodsList(),
        queryFn: async () => {
            const response = await api_1.api.get(`/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`);
            if (Array.isArray(response))
                return response;
            return response.data ?? [];
        },
        staleTime: 30_000,
    });
    const useEmployees = (search) => (0, react_query_1.useQuery)({
        queryKey: exports.reportingKeys.employeesList(),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('limit', '100');
            if (search)
                params.set('search', search);
            const response = await api_1.api.get(`/admin/users?${params.toString()}`);
            return response.items ?? [];
        },
        staleTime: 30_000,
    });
    const useSummaryReport = (periodId, filters) => (0, react_query_1.useQuery)({
        queryKey: exports.reportingKeys.summary(periodId ?? '', filters ?? {}),
        queryFn: async () => {
            if (!periodId)
                throw new Error('periodId is required');
            const params = new URLSearchParams();
            if (filters) {
                if (filters.system)
                    params.set('system', filters.system);
                if (filters.groupBy)
                    params.set('groupBy', filters.groupBy);
                if (filters.isPlanned)
                    params.set('isPlanned', filters.isPlanned);
                if (filters.search)
                    params.set('search', filters.search);
                if (filters.sortField)
                    params.set('sortField', filters.sortField);
                if (filters.sortOrder)
                    params.set('sortOrder', filters.sortOrder);
                params.set('page', String(filters.page ?? 1));
                params.set('pageSize', String(filters.pageSize ?? 50));
            }
            const qs = params.toString();
            const endpoint = `/reporting/periods/${periodId}/summary${qs ? `?${qs}` : ''}`;
            return await api_1.api.get(endpoint);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const usePersonalReport = (periodId, userId) => (0, react_query_1.useQuery)({
        queryKey: exports.reportingKeys.personal(periodId ?? '', userId ?? 'me'),
        queryFn: async () => {
            if (!periodId)
                throw new Error('periodId is required');
            const endpoint = userId
                ? `/reporting/periods/${periodId}/personal/${userId}`
                : `/reporting/periods/${periodId}/personal/me`;
            return await api_1.api.get(endpoint);
        },
        enabled: !!periodId,
        staleTime: 15_000,
        retry: 1,
    });
    const usePeriodStatistics = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.reportingKeys.statistics(periodId ?? ''),
        queryFn: async () => {
            if (!periodId)
                throw new Error('periodId is required');
            return await api_1.api.get(`/reporting/periods/${periodId}/statistics`);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useSubmitManagerEvaluation = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ evaluationId, periodId, youtrackIssueId, userId, evaluationType, percent, comment, }) => {
            if (evaluationId) {
                return await api_1.api.put(`/reporting/evaluations/manager/${evaluationId}`, {
                    evaluationType,
                    percent,
                    comment,
                });
            }
            return await api_1.api.post('/reporting/evaluations/manager', {
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
                queryKey: exports.reportingKeys.all,
            });
            toast({
                title: 'Оценка руководителя сохранена',
                description: 'Оценка успешно отправлена.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка при сохранении оценки руководителя',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
    const useSubmitBusinessEvaluation = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ evaluationId, periodId, youtrackIssueId, evaluationType, percent, comment, }) => {
            if (evaluationId) {
                return await api_1.api.put(`/reporting/evaluations/business/${evaluationId}`, {
                    evaluationType,
                    percent,
                    comment,
                });
            }
            return await api_1.api.post('/reporting/evaluations/business', {
                periodId,
                youtrackIssueId,
                evaluationType,
                percent,
                comment,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: exports.reportingKeys.all,
            });
            toast({
                title: 'Оценка бизнеса сохранена',
                description: 'Оценка успешно отправлена.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка при сохранении оценки бизнеса',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
    const useRecalculateReports = () => (0, react_query_1.useMutation)({
        mutationFn: async (periodId) => {
            return await api_1.api.post(`/reporting/periods/${periodId}/recalculate`);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: exports.reportingKeys.all,
            });
            toast({
                title: 'Отчёты пересчитаны',
                description: `Сформировано личных отчётов: ${data.personalReportsGenerated}, сводных: ${data.summaryReportsGenerated}.`,
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка пересчёта отчётов',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
    const findPeriodByKey = (periods, periodKey) => {
        const [yearStr, monthStr] = periodKey.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        return periods.find((p) => p.year === year && p.month === month);
    };
    const buildPeriodOptions = (periods) => {
        return periods
            .map((p) => ({
            value: `${p.year}-${String(p.month).padStart(2, '0')}`,
            label: `${monthsRu[p.month - 1]} ${p.year}`,
            year: p.year,
            month: p.month,
        }))
            .sort((a, b) => {
            if (a.year !== b.year)
                return b.year - a.year;
            return b.month - a.month;
        });
    };
    return {
        usePeriods,
        useEmployees,
        useSummaryReport,
        usePersonalReport,
        usePeriodStatistics,
        useSubmitManagerEvaluation,
        useSubmitBusinessEvaluation,
        useRecalculateReports,
        findPeriodByKey,
        buildPeriodOptions,
        keys: exports.reportingKeys,
    };
}
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
//# sourceMappingURL=useReports.js.map