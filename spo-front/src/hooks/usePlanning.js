"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningKeys = void 0;
exports.flattenBacklogItems = flattenBacklogItems;
exports.capacityToEmployees = capacityToEmployees;
exports.usePlanning = usePlanning;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
function flattenBacklogItems(items, parentIssueNumber) {
    const result = [];
    for (const item of items) {
        const issue = {
            id: item.id,
            idReadable: item.issueNumber,
            summary: item.summary,
            projectId: "",
            systemId: "",
            type: "Task",
            priority: "Medium",
            state: "Open",
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
        if (item.children && item.children.length > 0) {
            const children = flattenBacklogItems(item.children, item.issueNumber);
            result.push(...children);
        }
    }
    return result;
}
function capacityToEmployees(capacity, workRole = "development") {
    return capacity.employees.map((e) => ({
        id: e.employeeId,
        name: e.fullName ?? "Неизвестный",
        position: "Сотрудник",
        workRole,
        monthlyNetSalary: 0,
        ytLogin: "",
    }));
}
exports.planningKeys = {
    all: ["planning"],
    periods: () => ["planning", "periods"],
    period: (id) => ["planning", "period", id],
    backlog: (periodId, filters) => ["planning", "backlog", periodId, filters],
    capacity: (periodId) => ["planning", "capacity", periodId],
    planVersions: (periodId) => ["planning", "planVersions", periodId],
};
function usePlanning() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const usePeriods = (page = 1, limit = 20) => (0, react_query_1.useQuery)({
        queryKey: exports.planningKeys.periods(),
        queryFn: async () => {
            const response = await api_1.api.get(`/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`);
            return response;
        },
        staleTime: 30_000,
    });
    const usePeriodDetail = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.planningKeys.period(periodId ?? ""),
        queryFn: async () => {
            const response = await api_1.api.get(`/planning/periods/${periodId}`);
            return response;
        },
        enabled: !!periodId,
        staleTime: 30_000,
    });
    const useBacklog = (periodId, filters) => (0, react_query_1.useQuery)({
        queryKey: exports.planningKeys.backlog(periodId ?? "", filters ?? {}),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            const params = new URLSearchParams();
            if (filters) {
                if (filters.system)
                    params.set("system", filters.system);
                if (filters.project)
                    params.set("project", filters.project);
                if (filters.priority)
                    params.set("priority", filters.priority);
                if (filters.type)
                    params.set("type", filters.type);
                if (filters.status)
                    params.set("status", filters.status);
                if (filters.assignee)
                    params.set("assignee", filters.assignee);
                if (filters.reporter)
                    params.set("reporter", filters.reporter);
                if (filters.isPlanned)
                    params.set("isPlanned", filters.isPlanned);
                if (filters.readinessMin !== undefined)
                    params.set("readinessMin", String(filters.readinessMin));
                if (filters.readinessMax !== undefined)
                    params.set("readinessMax", String(filters.readinessMax));
                if (filters.search)
                    params.set("search", filters.search);
                params.set("page", String(filters.page ?? 1));
                params.set("limit", String(filters.limit ?? 100));
            }
            const qs = params.toString();
            const endpoint = `/planning/periods/${periodId}/backlog${qs ? `?${qs}` : ""}`;
            return await api_1.api.get(endpoint);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useCapacity = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.planningKeys.capacity(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/planning/periods/${periodId}/capacity`);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useAssignTask = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, taskId, employeeId, plannedHours, }) => {
            return await api_1.api.put(`/planning/periods/${periodId}/tasks/${taskId}`, {
                assigneeId: employeeId,
                plannedHours,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.backlog(variables.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.capacity(variables.periodId),
            });
            toast({
                title: "Задача назначена",
                description: `Задача назначена на сотрудника в период ${variables.periodId}`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка назначения",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const useUnassignTask = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, taskId, }) => {
            return await api_1.api.delete(`/planning/periods/${periodId}/tasks/${taskId}`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.backlog(variables.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.capacity(variables.periodId),
            });
            toast({
                title: "Назначение снято",
                description: "Задача снята с исполнителя",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка снятия назначения",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const useFixPlan = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, comment, }) => {
            return await api_1.api.post(`/planning/periods/${periodId}/fix-plan`, comment ? { comment } : undefined);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.period(variables.periodId),
            });
            toast({
                title: "План зафиксирован",
                description: `План спринта ${variables.periodId} зафиксирован`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка фиксации плана",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const useUpdatePeriod = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, ...settings }) => {
            return await api_1.api.put(`/planning/periods/${periodId}`, settings);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.period(variables.periodId),
            });
            toast({
                title: "Настройки сохранены",
                description: "Настройки периода обновлены",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка сохранения настроек",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const usePlanVersions = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.planningKeys.planVersions(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/planning/periods/${periodId}/plan-versions`);
        },
        enabled: !!periodId,
        staleTime: 30_000,
    });
    const useTransitionPeriod = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, transition, reason, }) => {
            return await api_1.api.post(`/planning/periods/${periodId}/transition`, { transition, reason });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.period(variables.periodId),
            });
            toast({
                title: "Статус изменён",
                description: `Период ${variables.periodId} переведён в новый статус`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка изменения статуса",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const useUpdateTaskSort = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, taskId, sortOrder, }) => {
            return await api_1.api.put(`/planning/periods/${periodId}/tasks/${taskId}/sort`, { sortOrder });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.backlog(variables.periodId),
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка сортировки",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const useUpdateTaskReadiness = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, taskId, readinessPercent, }) => {
            return await api_1.api.put(`/planning/periods/${periodId}/tasks/${taskId}/readiness`, { readinessPercent });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: exports.planningKeys.backlog(variables.periodId),
            });
            toast({
                title: "Готовность обновлена",
                description: `Готовность задачи обновлена до ${variables.readinessPercent}%`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка обновления готовности",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    return {
        usePeriods,
        usePeriodDetail,
        useBacklog,
        useCapacity,
        usePlanVersions,
        useAssignTask,
        useUnassignTask,
        useFixPlan,
        useUpdatePeriod,
        useTransitionPeriod,
        useUpdateTaskSort,
        useUpdateTaskReadiness,
        flattenBacklogItems,
        capacityToEmployees,
        planningKeys: exports.planningKeys,
        queryClient,
    };
}
//# sourceMappingURL=usePlanning.js.map