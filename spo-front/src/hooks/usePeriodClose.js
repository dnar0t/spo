"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.periodCloseKeys = void 0;
exports.usePeriodClose = usePeriodClose;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
exports.periodCloseKeys = {
    all: ["periodClose"],
    periods: () => ["periodClose", "periods"],
    readiness: (periodId) => ["periodClose", "readiness", periodId],
    snapshot: (periodId) => ["periodClose", "snapshot", periodId],
    snapshotStatus: (periodId) => ["periodClose", "snapshotStatus", periodId],
    statistics: (periodId) => ["periodClose", "statistics", periodId],
};
function usePeriodClose() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const usePeriods = (page = 1, limit = 50) => (0, react_query_1.useQuery)({
        queryKey: exports.periodCloseKeys.periods(),
        queryFn: async () => {
            return await api_1.api.get(`/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`);
        },
        staleTime: 30_000,
    });
    const usePeriodReadiness = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.periodCloseKeys.readiness(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/periods/${periodId}/readiness`);
        },
        enabled: !!periodId,
        staleTime: 10_000,
        retry: 1,
    });
    const useClosePeriod = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, reason, }) => {
            return await api_1.api.post(`/periods/${periodId}/close`, {
                reason,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.readiness(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.snapshotStatus(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.snapshot(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.periods(),
            });
            toast({
                title: "Период закрыт",
                description: `Создан immutable snapshot · ${data.snapshotId}`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка закрытия",
                description: error instanceof Error ? error.message : "Не удалось закрыть период",
                variant: "destructive",
            });
        },
    });
    const useReopenPeriod = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ periodId, reason, }) => {
            return await api_1.api.post(`/periods/${periodId}/reopen`, {
                reason,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.readiness(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.snapshotStatus(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.snapshot(data.periodId),
            });
            queryClient.invalidateQueries({
                queryKey: exports.periodCloseKeys.periods(),
            });
            toast({
                title: "Период переоткрыт",
                description: `Действие зафиксировано в аудите · ${data.reopenReason}`,
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка переоткрытия",
                description: error instanceof Error ? error.message : "Не удалось переоткрыть период",
                variant: "destructive",
            });
        },
    });
    const useSnapshotStatus = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.periodCloseKeys.snapshotStatus(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/periods/${periodId}/snapshot/status`);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    const useSnapshot = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.periodCloseKeys.snapshot(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/periods/${periodId}/snapshot`);
        },
        enabled: !!periodId,
        staleTime: 30_000,
        retry: 1,
    });
    const usePeriodStatistics = (periodId) => (0, react_query_1.useQuery)({
        queryKey: exports.periodCloseKeys.statistics(periodId ?? ""),
        queryFn: async () => {
            if (!periodId)
                throw new Error("periodId is required");
            return await api_1.api.get(`/reporting/periods/${periodId}/statistics`);
        },
        enabled: !!periodId,
        staleTime: 15_000,
    });
    return {
        usePeriods,
        usePeriodReadiness,
        useClosePeriod,
        useReopenPeriod,
        useSnapshotStatus,
        useSnapshot,
        usePeriodStatistics,
        periodCloseKeys: exports.periodCloseKeys,
        queryClient,
    };
}
//# sourceMappingURL=usePeriodClose.js.map