"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTimesheets = useTimesheets;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
const timesheetKeys = {
    all: ["timesheets"],
    mine: (year, month) => ["timesheets", "mine", year, month],
    team: (year, month) => ["timesheets", "team", year, month],
    history: (id) => ["timesheets", "history", id],
};
function useTimesheets() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const useMyTimesheet = (year, month) => (0, react_query_1.useQuery)({
        queryKey: timesheetKeys.mine(year, month),
        queryFn: async () => {
            const response = await api_1.api.get(`/timesheets/mine?year=${year}&month=${month}`);
            return response;
        },
        staleTime: 10_000,
    });
    const useTeamTimesheets = (year, month, employeeIds) => (0, react_query_1.useQuery)({
        queryKey: timesheetKeys.team(year, month),
        queryFn: async () => {
            const ids = employeeIds.join(",");
            const response = await api_1.api.get(`/timesheets/team?year=${year}&month=${month}&employeeIds=${ids}`);
            return response;
        },
        enabled: employeeIds.length > 0,
        staleTime: 10_000,
    });
    const useTimesheetHistory = (id) => (0, react_query_1.useQuery)({
        queryKey: timesheetKeys.history(id ?? ""),
        queryFn: async () => {
            if (!id)
                throw new Error("timesheet id is required");
            const response = await api_1.api.get(`/timesheets/${id}/history`);
            return response;
        },
        enabled: !!id,
        staleTime: 30_000,
    });
    const useUpdateRow = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ timesheetId, rowId, ...data }) => {
            const response = await api_1.api.put(`/timesheets/${timesheetId}/rows/${rowId}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        },
        onError: (error) => {
            toast({
                title: "Ошибка обновления строки",
                description: error.message || "Не удалось обновить строку табеля.",
                variant: "destructive",
            });
        },
    });
    const useAddRow = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ timesheetId, ...data }) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/rows`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        },
        onError: (error) => {
            toast({
                title: "Ошибка добавления строки",
                description: error.message || "Не удалось добавить строку в табель.",
                variant: "destructive",
            });
        },
    });
    const useDeleteRow = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ timesheetId, rowId, }) => {
            await api_1.api.delete(`/timesheets/${timesheetId}/rows/${rowId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        },
        onError: (error) => {
            toast({
                title: "Ошибка удаления строки",
                description: error.message || "Не удалось удалить строку из табеля.",
                variant: "destructive",
            });
        },
    });
    const useSubmit = () => (0, react_query_1.useMutation)({
        mutationFn: async (timesheetId) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/submit`);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
            toast({
                title: "Табель отправлен",
                description: "Табель направлен на согласование руководителю.",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка отправки",
                description: error.message || "Не удалось отправить табель.",
                variant: "destructive",
            });
        },
    });
    const useRecall = () => (0, react_query_1.useMutation)({
        mutationFn: async (timesheetId) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/recall`);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
            toast({
                title: "Табель отозван",
                description: "Табель возвращён в статус черновика.",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка отзыва",
                description: error.message || "Не удалось отозвать табель.",
                variant: "destructive",
            });
        },
    });
    const useManagerApprove = () => (0, react_query_1.useMutation)({
        mutationFn: async (timesheetId) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/manager-approve`);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
            toast({
                title: "Табель согласован",
                description: "Табель направлен на утверждение директору.",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка согласования",
                description: error.message || "Не удалось согласовать табель.",
                variant: "destructive",
            });
        },
    });
    const useDirectorApprove = () => (0, react_query_1.useMutation)({
        mutationFn: async (timesheetId) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/director-approve`);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
            toast({
                title: "Табель утверждён",
                description: "Табель окончательно утверждён.",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка утверждения",
                description: error.message || "Не удалось утвердить табель.",
                variant: "destructive",
            });
        },
    });
    const useReject = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ timesheetId, comment, }) => {
            const response = await api_1.api.post(`/timesheets/${timesheetId}/reject`, { comment });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
            toast({
                title: "Табель отклонён",
                description: "Табель возвращён сотруднику на доработку.",
            });
        },
        onError: (error) => {
            toast({
                title: "Ошибка отклонения",
                description: error.message || "Не удалось отклонить табель.",
                variant: "destructive",
            });
        },
    });
    const usePeriods = (page = 1, limit = 20) => (0, react_query_1.useQuery)({
        queryKey: ["planning", "periods"],
        queryFn: async () => {
            const response = await api_1.api.get(`/planning/periods?page=${page}&limit=${limit}&sortBy=year&sortOrder=DESC`);
            return response;
        },
        staleTime: 30_000,
    });
    const useBacklog = (params) => {
        const { search, isPlanned, page = 1, limit = 50 } = params ?? {};
        return (0, react_query_1.useQuery)({
            queryKey: ["planning", "backlog", { search, isPlanned, page, limit }],
            queryFn: async () => {
                const qs = new URLSearchParams();
                qs.set("page", String(page));
                qs.set("limit", String(limit));
                if (search)
                    qs.set("search", search);
                if (isPlanned !== undefined)
                    qs.set("isPlanned", String(isPlanned));
                const response = await api_1.api.get(`/planning/backlog?${qs.toString()}`);
                return response;
            },
            staleTime: 15_000,
        });
    };
    const useDictionaries = () => (0, react_query_1.useQuery)({
        queryKey: ["admin", "dictionaries"],
        queryFn: async () => {
            const response = await api_1.api.get("/admin/dictionaries");
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
//# sourceMappingURL=useTimesheets.js.map