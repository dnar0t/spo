"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAdmin = useAdmin;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const use_toast_1 = require("@/hooks/use-toast");
const adminKeys = {
    all: ['admin'],
    users: (filters) => ['admin', 'users', filters],
    usersAll: ['admin', 'users'],
    dictionaries: ['admin', 'dictionaries'],
    auditLog: (filters) => ['admin', 'audit-log', filters],
    sessions: ['admin', 'sessions'],
    sensitiveChanges: (filters) => ['admin', 'sensitive-changes', filters],
    planningSettings: ['admin', 'settings', 'planning'],
    integrations: ['admin', 'integrations'],
};
function useAdmin() {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { toast } = (0, use_toast_1.useToast)();
    const useUsers = (search, isActive, page = 1, limit = 50) => (0, react_query_1.useQuery)({
        queryKey: adminKeys.users({ search, isActive, page, limit }),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', String(limit));
            if (search)
                params.set('search', search);
            if (isActive !== undefined)
                params.set('isActive', String(isActive));
            const response = await api_1.api.get(`/admin/users?${params.toString()}`);
            return response;
        },
        staleTime: 15_000,
    });
    const useCreateUser = () => (0, react_query_1.useMutation)({
        mutationFn: async (data) => {
            const response = await api_1.api.post('/admin/users', data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
            toast({
                title: 'Пользователь создан',
                description: 'Учётная запись успешно создана.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка создания',
                description: error.message || 'Не удалось создать пользователя.',
                variant: 'destructive',
            });
        },
    });
    const useUpdateUser = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ id, ...data }) => {
            const response = await api_1.api.put(`/admin/users/${id}`, data);
            return response;
        },
        onMutate: async (vars) => {
            await queryClient.cancelQueries({ queryKey: adminKeys.usersAll });
            const snapshots = queryClient.getQueriesData({ queryKey: adminKeys.usersAll });
            queryClient.setQueriesData({ queryKey: adminKeys.usersAll }, (old) => {
                if (!old)
                    return old;
                return {
                    ...old,
                    data: old.data.map((u) => u.id === vars.id ? { ...u, ...vars } : u),
                };
            });
            return { snapshots };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
            toast({
                title: 'Изменения сохранены',
                description: 'Данные пользователя обновлены.',
            });
        },
        onError: (error, vars, context) => {
            if (context?.snapshots) {
                for (const [key, data] of context.snapshots) {
                    queryClient.setQueryData(key, data);
                }
            }
            toast({
                title: 'Ошибка обновления',
                description: error.message || 'Не удалось обновить пользователя.',
                variant: 'destructive',
            });
        },
    });
    const useDeactivateUser = () => (0, react_query_1.useMutation)({
        mutationFn: async (id) => {
            await api_1.api.delete(`/admin/users/${id}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: adminKeys.usersAll });
            const snapshots = queryClient.getQueriesData({ queryKey: adminKeys.usersAll });
            queryClient.setQueriesData({ queryKey: adminKeys.usersAll }, (old) => {
                if (!old)
                    return old;
                return {
                    ...old,
                    data: old.data.map((u) => u.id === id ? { ...u, isActive: false } : u),
                };
            });
            return { snapshots };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
            toast({
                title: 'Учётная запись деактивирована',
                description: 'Пользователь успешно деактивирован.',
            });
        },
        onError: (error, id, context) => {
            if (context?.snapshots) {
                for (const [key, data] of context.snapshots) {
                    queryClient.setQueryData(key, data);
                }
            }
            toast({
                title: 'Ошибка деактивации',
                description: error.message || 'Не удалось деактивировать пользователя.',
                variant: 'destructive',
            });
        },
    });
    const useAssignRoles = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ id, roles }) => {
            const response = await api_1.api.put(`/admin/users/${id}/roles`, {
                roleIds: roles,
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
            toast({
                title: 'Роли назначены',
                description: 'Роли пользователя обновлены.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка назначения ролей',
                description: error.message || 'Не удалось назначить роли.',
                variant: 'destructive',
            });
        },
    });
    const useAssignManager = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ id, managerId, }) => {
            const response = await api_1.api.put(`/admin/users/${id}/manager`, { managerId });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
            toast({
                title: 'Руководитель назначен',
                description: 'Руководитель пользователя обновлён.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка назначения руководителя',
                description: error.message || 'Не удалось назначить руководителя.',
                variant: 'destructive',
            });
        },
    });
    const useDictionaries = () => (0, react_query_1.useQuery)({
        queryKey: adminKeys.dictionaries,
        queryFn: async () => {
            const response = await api_1.api.get('/admin/dictionaries');
            return response;
        },
        staleTime: 60_000,
    });
    const useAuditLog = (filters) => (0, react_query_1.useQuery)({
        queryKey: adminKeys.auditLog(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(filters?.page ?? 1));
            params.set('limit', String(filters?.limit ?? 50));
            if (filters?.userId)
                params.set('userId', filters.userId);
            if (filters?.action)
                params.set('action', filters.action);
            if (filters?.entityType)
                params.set('entityType', filters.entityType);
            if (filters?.dateFrom)
                params.set('dateFrom', filters.dateFrom);
            if (filters?.dateTo)
                params.set('dateTo', filters.dateTo);
            const response = await api_1.api.get(`/admin/audit-log?${params.toString()}`);
            return response;
        },
        staleTime: 10_000,
    });
    const useSessions = () => (0, react_query_1.useQuery)({
        queryKey: adminKeys.sessions,
        queryFn: async () => {
            const response = await api_1.api.get('/admin/sessions');
            return response;
        },
        staleTime: 10_000,
    });
    const useSensitiveChanges = (filters) => (0, react_query_1.useQuery)({
        queryKey: adminKeys.sensitiveChanges(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(filters?.page ?? 1));
            params.set('limit', String(filters?.limit ?? 50));
            const response = await api_1.api.get(`/admin/sensitive-changes?${params.toString()}`);
            return response;
        },
        staleTime: 10_000,
    });
    const useListPlanningSettings = () => (0, react_query_1.useQuery)({
        queryKey: adminKeys.planningSettings,
        queryFn: async () => {
            const response = await api_1.api.get('/admin/settings/planning');
            return response;
        },
        staleTime: 30_000,
    });
    const useCreatePlanningSettings = () => (0, react_query_1.useMutation)({
        mutationFn: async (data) => {
            const response = await api_1.api.post('/admin/settings/planning', data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planningSettings });
            toast({
                title: 'Конфигурация создана',
                description: 'Новый спринт добавлен.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка создания',
                description: error.message || 'Не удалось создать конфигурацию спринта.',
                variant: 'destructive',
            });
        },
    });
    const useUpdatePlanningSettings = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ id, ...data }) => {
            await api_1.api.put(`/admin/settings/planning/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planningSettings });
            toast({
                title: 'Параметры сохранены',
                description: 'Конфигурация спринта обновлена.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка сохранения',
                description: error.message || 'Не удалось сохранить параметры спринта.',
                variant: 'destructive',
            });
        },
    });
    const useDeletePlanningSettings = () => (0, react_query_1.useMutation)({
        mutationFn: async (id) => {
            await api_1.api.delete(`/admin/settings/planning/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.planningSettings });
            toast({
                title: 'Конфигурация удалена',
                description: 'Спринт удалён из списка.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка удаления',
                description: error.message || 'Не удалось удалить конфигурацию спринта.',
                variant: 'destructive',
            });
        },
    });
    const useIntegrations = () => (0, react_query_1.useQuery)({
        queryKey: adminKeys.integrations,
        queryFn: async () => {
            const response = await api_1.api.get('/admin/integrations');
            return response;
        },
        staleTime: 30_000,
    });
    const useUpdateIntegration = () => (0, react_query_1.useMutation)({
        mutationFn: async ({ id, ...data }) => {
            const response = await api_1.api.put(`/admin/integrations/${id}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminKeys.integrations });
            toast({
                title: 'Настройки интеграции сохранены',
                description: 'Параметры подключения обновлены.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Ошибка сохранения',
                description: error.message || 'Не удалось обновить настройки интеграции.',
                variant: 'destructive',
            });
        },
    });
    return {
        useUsers,
        useCreateUser,
        useUpdateUser,
        useDeactivateUser,
        useAssignRoles,
        useAssignManager,
        useDictionaries,
        useAuditLog,
        useSessions,
        useSensitiveChanges,
        useListPlanningSettings,
        useCreatePlanningSettings,
        useUpdatePlanningSettings,
        useDeletePlanningSettings,
        useIntegrations,
        useUpdateIntegration,
    };
}
//# sourceMappingURL=useAdmin.js.map