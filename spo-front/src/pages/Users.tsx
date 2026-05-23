import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  KeyRound,
  Search,
  ShieldCheck,
  ShieldX,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { APP_ROLE_LABEL_RU, PRIVILEGES, type AppRole } from '@/data/adminMock';
import { projects, systems, WORK_ROLE_LABEL_RU, type WorkRole } from '@/data/planningMock';
import { useAdmin, type AdminUserDto, type AdminDictionariesDto } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const ALL_ROLES: AppRole[] = ['employee', 'manager', 'business', 'accountant', 'director', 'admin'];
const PLANNABLE_ROLES: WorkRole[] = ['development', 'testing', 'management'];

// ====================== Страница ======================

const Users = () => {
  const { toast } = useToast();
  const admin = useAdmin();

  // Состояние
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [editing, setEditing] = useState<AdminUserDto | null>(null);

  // Запросы
  const isActiveParam =
    statusFilter === 'active' ? true : statusFilter === 'blocked' ? false : undefined;
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = admin.useUsers(search || undefined, isActiveParam);
  const { data: dictData, isLoading: dictLoading } = admin.useDictionaries();
  const updateUser = admin.useUpdateUser();
  const deactivateUser = admin.useDeactivateUser();
  const assignRoles = admin.useAssignRoles();

  const users = useMemo(() => usersData?.data ?? [], [usersData]);
  const totalUsers = useMemo(() => usersData?.total ?? 0, [usersData]);

  // Фильтрация по роли (клиентская, т.к. API фильтрует только по статусу и поиску)
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [users, roleFilter]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const directors = users.filter((u) => u.roles.includes('director')).length;
    const managers = users.filter((u) => u.roles.includes('manager')).length;
    const with2fa = users.filter((u) => u.twoFactorEnabled).length;
    return { active, blocked: users.length - active, directors, managers, with2fa };
  }, [users]);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const handleToggleActive = async (u: AdminUserDto) => {
    const newActive = !u.isActive;
    const userId = u.id;

    // Мгновенное локальное обновление через queryClient
    const queryClient = admin.queryClient;
    queryClient.setQueriesData({ queryKey: ['admin', 'users'] }, (old: unknown) => {
      if (!old || typeof old !== 'object') return old;
      const paginated = old as PaginatedResult<AdminUserDto>;
      return {
        ...paginated,
        data: paginated.data.map((x) =>
          x.id === userId ? { ...x, isActive: newActive } : x
        ),
      };
    });

    // Блокируем повторные клики
    setTogglingIds((prev) => new Set(prev).add(userId));

    try {
      if (newActive) {
        // Активация
        await api.put(`/admin/users/${userId}`, { isActive: true });
      } else {
        // Деактивация
        await api.delete(`/admin/users/${userId}`);
      }
      // Обновляем с сервера после успеха
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      // Откат при ошибке
      queryClient.setQueriesData({ queryKey: ['admin', 'users'] }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const paginated = old as PaginatedResult<AdminUserDto>;
        return {
          ...paginated,
          data: paginated.data.map((x) =>
            x.id === userId ? { ...x, isActive: u.isActive } : x
          ),
        };
      });
      toast({
        title: newActive ? 'Ошибка активации' : 'Ошибка деактивации',
        description: (err as Error).message || 'Повторите попытку',
        variant: 'destructive',
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  };

  const handleSaveUser = async (next: AdminUserDto) => {
    try {
      // Сохраняем роли
      await assignRoles.mutateAsync({ id: next.id, roles: next.roles });
      // Обновляем основные поля
      await updateUser.mutateAsync({
        id: next.id,
        email: next.email,
        fullName: next.fullName,
        isActive: next.isActive,
      });
      setEditing(null);
    } catch (err) {
      toast({
        title: 'Ошибка сохранения',
        description: (err as Error).message || 'Не удалось сохранить изменения.',
        variant: 'destructive',
      });
    }
  };

  // Ошибка загрузки
  if (usersError) {
    toast({
      title: 'Ошибка загрузки пользователей',
      description: (usersError as Error).message || 'Не удалось получить список пользователей.',
      variant: 'destructive',
    });
  }

  return (
    <AppLayout>
      <PageHeader
        title="Пользователи и роли"
        description="RBAC-роли, оргструктура и ABAC-ограничения по проектам/системам/направлениям. Источник учёток — LDAP, локальные допускаются."
        breadcrumbs={[
          { label: 'Главная' },
          { label: 'Администрирование' },
          { label: 'Пользователи и роли' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm">
              <KeyRound className="h-4 w-4" />
              Синхронизировать LDAP
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover" disabled>
              <UserPlus className="h-4 w-4" />
              Создать пользователя
            </Button>
          </>
        }
      />

      <div className="p-4 space-y-3">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard
            label="Активных учёток"
            value={String(stats.active)}
            unit={`из ${totalUsers}`}
            icon={UsersIcon}
            accent="success"
          />
          <KpiCard
            label="Заблокировано"
            value={String(stats.blocked)}
            unit="требуют внимания"
            icon={ShieldX}
            accent={stats.blocked > 0 ? 'warning' : 'info'}
          />
          <KpiCard
            label="Руководителей"
            value={String(stats.managers)}
            unit={`директоров: ${stats.directors}`}
            icon={ShieldCheck}
            accent="primary"
          />
          <KpiCard
            label="2FA включена"
            value={String(stats.with2fa)}
            unit={`из ${totalUsers}`}
            icon={KeyRound}
            accent={stats.with2fa < totalUsers / 2 ? 'warning' : 'success'}
          />
        </div>

        <TooltipProvider delayDuration={200}>
          <Tabs defaultValue="list" className="space-y-3">
            <TabsList>
              <TabsTrigger value="list">Учётные записи</TabsTrigger>
              <TabsTrigger value="matrix">Матрица прав</TabsTrigger>
              <TabsTrigger value="org">Оргструктура</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-3">
              {/* Фильтры */}
              <div className="bg-card border border-border rounded-md shadow-card p-2 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по логину, ФИО, должности"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все роли</SelectItem>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {APP_ROLE_LABEL_RU[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="blocked">Заблокированные</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {usersLoading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                  Найдено: {filtered.length} из {totalUsers}
                </span>
              </div>

              {/* Таблица пользователей */}
              <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-xs text-muted-foreground">
                      Загрузка пользователей...
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead className="bg-muted">
                        <tr>
                          <Th>Пользователь</Th>
                          <Th>Должность · Руководитель</Th>
                          <Th>Роли</Th>
                          <Th>Источник</Th>
                          <Th>В планировании</Th>
                          <Th>2FA</Th>
                          <Th>Последний вход</Th>
                          <Th>Статус</Th>
                          <Th className="text-right">Действия</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((u) => {
                          return (
                            <tr
                              key={u.id}
                              className={cn('hover:bg-muted/30', !u.isActive && 'opacity-50')}
                            >
                              <Td>
                                <div className="font-medium text-foreground">
                                  {u.fullName || u.login || '—'}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {u.login} · {u.email}
                                </div>
                              </Td>
                              <Td>
                                <div>{u.roles.join(', ') || '—'}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {u.managerName
                                    ? `↳ ${u.managerName}`
                                    : u.roles.includes('director')
                                      ? 'директор'
                                      : '—'}
                                </div>
                              </Td>
                              <Td>
                                <div className="flex flex-wrap gap-1">
                                  {u.roles.map((r) => (
                                    <RoleBadge key={r} role={r as AppRole} />
                                  ))}
                                </div>
                              </Td>
                              <Td>
                                <Switch
                                  checked={u.canPlan ?? false}
                                  onCheckedChange={() => {
                                    updateUser.mutate({
                                      id: u.id,
                                      email: u.email,
                                      fullName: u.fullName,
                                      isActive: u.isActive,
                                      canPlan: !(u.canPlan ?? false),
                                    });
                                  }}
                                  disabled={updateUser.isPending}
                                />
                              </Td>
                              <Td>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] py-0 h-4 px-1.5',
                                    u.source === 'ldap'
                                      ? 'bg-info/10 text-info border-info/30'
                                      : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {u.source === 'ldap' ? 'LDAP' : 'Локально'}
                                </Badge>
                              </Td>
                              <Td>
                                {u.twoFactorEnabled ? (
                                  <Badge
                                    className="bg-success/15 text-success border-success/30 text-[10px] py-0 h-4 px-1.5"
                                    variant="outline"
                                  >
                                    Вкл
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </Td>
                              <Td>
                                <span className="num-tabular text-[11px]">
                                  {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'никогда'}
                                </span>
                              </Td>
                              <Td>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={u.isActive}
                                    onCheckedChange={() => handleToggleActive(u)}
                                  />
                                  <span
                                    className={cn(
                                      'text-[11px]',
                                      u.isActive ? 'text-success' : 'text-warning',
                                    )}
                                  >
                                    {u.isActive ? 'Активна' : 'Заблокирована'}
                                  </span>
                                </div>
                              </Td>
                              <Td className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  onClick={() => setEditing(u)}
                                >
                                  Изменить роли
                                </Button>
                              </Td>
                            </tr>
                          );
                        })}
                        {filtered.length === 0 && !usersLoading && (
                          <tr>
                            <td
                              colSpan={9}
                              className="text-center text-muted-foreground py-6 text-xs"
                            >
                              Нет учётных записей по выбранным фильтрам
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="matrix">
              <PrivilegesMatrix />
            </TabsContent>

            <TabsContent value="org">
              <OrgTree />
            </TabsContent>
          </Tabs>
        </TooltipProvider>

        {editing && (
          <EditUserDialog
            user={editing}
            dictionaries={dictData}
            onClose={() => setEditing(null)}
            onSave={handleSaveUser}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Users;

// ====================== Подкомпоненты ======================

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1.5 border-b border-border',
        className,
      )}
    >
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-2 py-1.5 align-top border-b border-border text-xs', className)}>
      {children}
    </td>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const map: Record<AppRole, string> = {
    director: 'bg-primary/10 text-primary border-primary/30',
    admin: 'bg-destructive/10 text-destructive border-destructive/30',
    manager: 'bg-info/10 text-info border-info/30',
    business: 'bg-warning/15 text-warning border-warning/40',
    accountant: 'bg-success/10 text-success border-success/30',
    employee: 'bg-muted text-foreground border-border',
  };
  return (
    <Badge variant="outline" className={cn('font-normal text-[10px] py-0 h-4 px-1.5', map[role])}>
      {APP_ROLE_LABEL_RU[role]}
    </Badge>
  );
}

function PrivilegesMatrix() {
  const groups = useMemo(() => {
    const m = new Map<string, typeof PRIVILEGES>();
    for (const p of PRIVILEGES) {
      const arr = m.get(p.group) ?? [];
      arr.push(p);
      m.set(p.group, arr);
    }
    return [...m.entries()];
  }, []);
  return (
    <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border">
        <h2 className="text-xs font-semibold">Матрица привилегий по ролям (RBAC, ТЗ §17)</h2>
        <p className="text-[11px] text-muted-foreground">
          Базовые права ролей. Для конкретного пользователя действуют ABAC-ограничения по
          проектам/системам/направлениям.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead className="bg-muted">
            <tr>
              <Th className="w-[280px]">Привилегия</Th>
              {ALL_ROLES.map((r) => (
                <Th key={r} className="text-center">
                  {APP_ROLE_LABEL_RU[r]}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([group, items]) => (
              <>
                <tr key={`g-${group}`} className="bg-muted/40">
                  <td
                    colSpan={ALL_ROLES.length + 1}
                    className="px-2 py-1 text-[11px] font-semibold text-foreground border-b border-border"
                  >
                    {group}
                  </td>
                </tr>
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <Td>{p.label}</Td>
                    {ALL_ROLES.map((r) => (
                      <Td key={r} className="text-center">
                        {p.defaultRoles.includes(r) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success inline" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </Td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrgTree() {
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'org-tree'],
    queryFn: async () => {
      const result = await api.get<Record<string, unknown>>('/admin/users?limit=200');
      const items = ((result?.data as AdminUserDto[]) ??
        (result?.items as AdminUserDto[]) ??
        []) as AdminUserDto[];
      return items;
    },
    staleTime: 15_000,
  });

  const users = usersData ?? [];
  const director = users.find((u) => u.roles.includes('director'));

  const renderNode = (user: AdminUserDto, depth: number) => {
    const subs = users.filter((x) => x.managerId === user.id);
    return (
      <div key={user.id}>
        <div
          className="flex items-center gap-2 py-1 border-b border-border text-xs"
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <span className="font-medium text-foreground">{user.fullName || user.login}</span>
          <span className="text-[10px] text-muted-foreground">{user.roles.join(', ')}</span>
          <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 ml-auto">
            {user.source ?? '—'}
          </Badge>
          {user.roles.includes('director') && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-4 px-1.5 bg-primary/10 text-primary border-primary/30"
            >
              директор
            </Badge>
          )}
        </div>
        {subs.map((s) => renderNode(s, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border">
        <h2 className="text-xs font-semibold">Оргструктура (manager_id)</h2>
        <p className="text-[11px] text-muted-foreground">
          Видимость данных в системе строится по этой иерархии: руководитель видит прямых и
          косвенных подчинённых.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : director ? (
        renderNode(director, 0)
      ) : (
        <div className="text-center py-6 text-xs text-muted-foreground">
          Нет данных об оргструктуре
        </div>
      )}
    </div>
  );
}

function EditUserDialog({
  user,
  dictionaries,
  onClose,
  onSave,
}: {
  user: AdminUserDto;
  dictionaries?: AdminDictionariesDto;
  onClose: () => void;
  onSave: (u: AdminUserDto) => void;
}) {
  const [draft, setDraft] = useState<AdminUserDto>(user);

  const toggleRole = (r: AppRole) => {
    setDraft({
      ...draft,
      roles: draft.roles.includes(r) ? draft.roles.filter((x) => x !== r) : [...draft.roles, r],
    });
  };
  const toggleArr = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const dictProjects = dictionaries?.projects ?? projects;
  const dictSystems = dictionaries?.systems ?? systems;
  const dictWorkRoles = dictionaries?.workRoles ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Роли и ограничения · {draft.login}</DialogTitle>
          <DialogDescription>
            Назначение RBAC-ролей и ABAC-ограничений по проектам, системам и плановым направлениям
            (ТЗ §17.3).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">RBAC-роли</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {ALL_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={draft.roles.includes(r)}
                    onCheckedChange={() => toggleRole(r)}
                  />
                  <span>{APP_ROLE_LABEL_RU[r]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.twoFactorEnabled}
                onCheckedChange={(v) => setDraft({ ...draft, twoFactorEnabled: v })}
              />
              <Label className="text-xs">Двухфакторная аутентификация (2FA)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.canPlan ?? false}
                onCheckedChange={(v) => setDraft({ ...draft, canPlan: v })}
              />
              <Label className="text-xs">Участвует в планировании</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isActive}
                onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
              />
              <Label className="text-xs">Учётная запись активна</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">ABAC: проекты (пусто = все)</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {dictProjects.map((p: { id: string; shortName?: string; name: string }) => (
                <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={draft.abacProjects.includes(p.id)}
                    onCheckedChange={() =>
                      setDraft({ ...draft, abacProjects: toggleArr(draft.abacProjects, p.id) })
                    }
                  />
                  <span>
                    {p.shortName ?? p.name} · {p.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">ABAC: системы</Label>
              <div className="grid gap-1.5 mt-1.5">
                {dictSystems.map((s: { id: string; name: string }) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={draft.abacSystems.includes(s.id)}
                      onCheckedChange={() =>
                        setDraft({ ...draft, abacSystems: toggleArr(draft.abacSystems, s.id) })
                      }
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">ABAC: плановые направления</Label>
              <div className="grid gap-1.5 mt-1.5">
                {dictWorkRoles.length > 0
                  ? dictWorkRoles.map((r: { id: string; name: string; label: string }) => (
                      <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={draft.abacRoles.includes(r.name)}
                          onCheckedChange={() =>
                            setDraft({ ...draft, abacRoles: toggleArr(draft.abacRoles, r.name) })
                          }
                        />
                        <span>{r.label}</span>
                      </label>
                    ))
                  : PLANNABLE_ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={draft.abacRoles.includes(r)}
                          onCheckedChange={() =>
                            setDraft({ ...draft, abacRoles: toggleArr(draft.abacRoles, r) })
                          }
                        />
                        <span>{WORK_ROLE_LABEL_RU[r]}</span>
                      </label>
                    ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" /> Отмена
          </Button>
          <Button className="bg-primary hover:bg-primary-hover" onClick={() => onSave(draft)}>
            <CheckCircle2 className="h-4 w-4" /> Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
