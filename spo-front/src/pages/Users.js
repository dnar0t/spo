"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const KpiCard_1 = require("@/components/dashboard/KpiCard");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const switch_1 = require("@/components/ui/switch");
const checkbox_1 = require("@/components/ui/checkbox");
const lucide_react_1 = require("lucide-react");
const tabs_1 = require("@/components/ui/tabs");
const tooltip_1 = require("@/components/ui/tooltip");
const dialog_1 = require("@/components/ui/dialog");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_2 = require("lucide-react");
const adminMock_1 = require("@/data/adminMock");
const timesheetsMock_1 = require("@/data/timesheetsMock");
const planningMock_1 = require("@/data/planningMock");
const useAdmin_1 = require("@/hooks/useAdmin");
const ALL_ROLES = ['employee', 'manager', 'business', 'accountant', 'director', 'admin'];
const PLANNABLE_ROLES = ['development', 'testing', 'management'];
const Users = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const admin = (0, useAdmin_1.useAdmin)();
    const [search, setSearch] = (0, react_1.useState)('');
    const [roleFilter, setRoleFilter] = (0, react_1.useState)('all');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [editing, setEditing] = (0, react_1.useState)(null);
    const isActiveParam = statusFilter === 'active' ? true : statusFilter === 'blocked' ? false : undefined;
    const { data: usersData, isLoading: usersLoading, error: usersError, } = admin.useUsers(search || undefined, isActiveParam);
    const { data: dictData, isLoading: dictLoading } = admin.useDictionaries();
    const updateUser = admin.useUpdateUser();
    const deactivateUser = admin.useDeactivateUser();
    const assignRoles = admin.useAssignRoles();
    const users = usersData?.data ?? [];
    const totalUsers = usersData?.total ?? 0;
    const empById = (0, react_1.useMemo)(() => {
        const m = new Map();
        for (const e of timesheetsMock_1.orgEmployees)
            m.set(e.id, e);
        return m;
    }, []);
    const filtered = (0, react_1.useMemo)(() => {
        return users.filter((u) => {
            if (roleFilter !== 'all' && !u.roles.includes(roleFilter))
                return false;
            return true;
        });
    }, [users, roleFilter]);
    const stats = (0, react_1.useMemo)(() => {
        const active = users.filter((u) => u.isActive).length;
        const directors = users.filter((u) => u.roles.includes('director')).length;
        const managers = users.filter((u) => u.roles.includes('manager')).length;
        const with2fa = users.filter((u) => u.twoFactorEnabled).length;
        return { active, blocked: users.length - active, directors, managers, with2fa };
    }, [users]);
    const handleToggleActive = (u) => {
        if (u.isActive) {
            deactivateUser.mutate(u.id);
        }
        else {
            updateUser.mutate({
                id: u.id,
                email: u.email,
                fullName: u.fullName,
                isActive: true,
            });
        }
    };
    const handleSaveUser = (next) => {
        assignRoles.mutate({ id: next.id, roles: next.roles });
        updateUser.mutate({
            id: next.id,
            email: next.email,
            fullName: next.fullName,
            isActive: next.isActive,
        });
        setEditing(null);
    };
    if (usersError) {
        toast({
            title: 'Ошибка загрузки пользователей',
            description: usersError.message || 'Не удалось получить список пользователей.',
            variant: 'destructive',
        });
    }
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title="Пользователи и роли" description="RBAC-роли, оргструктура и ABAC-ограничения по проектам/системам/направлениям. Источник учёток — LDAP, локальные допускаются." breadcrumbs={[
            { label: 'Главная' },
            { label: 'Администрирование' },
            { label: 'Пользователи и роли' },
        ]} actions={<>
            <button_1.Button variant="outline" size="sm">
              <lucide_react_2.KeyRound className="h-4 w-4"/>
              Синхронизировать LDAP
            </button_1.Button>
            <button_1.Button size="sm" className="bg-primary hover:bg-primary-hover" disabled>
              <lucide_react_2.UserPlus className="h-4 w-4"/>
              Создать пользователя
            </button_1.Button>
          </>}/>

      <div className="p-4 space-y-3">
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard_1.KpiCard label="Активных учёток" value={String(stats.active)} unit={`из ${totalUsers}`} icon={lucide_react_2.Users} accent="success"/>
          <KpiCard_1.KpiCard label="Заблокировано" value={String(stats.blocked)} unit="требуют внимания" icon={lucide_react_2.ShieldX} accent={stats.blocked > 0 ? 'warning' : 'info'}/>
          <KpiCard_1.KpiCard label="Руководителей" value={String(stats.managers)} unit={`директоров: ${stats.directors}`} icon={lucide_react_2.ShieldCheck} accent="primary"/>
          <KpiCard_1.KpiCard label="2FA включена" value={String(stats.with2fa)} unit={`из ${totalUsers}`} icon={lucide_react_2.KeyRound} accent={stats.with2fa < totalUsers / 2 ? 'warning' : 'success'}/>
        </div>

        <tooltip_1.TooltipProvider delayDuration={200}>
          <tabs_1.Tabs defaultValue="list" className="space-y-3">
            <tabs_1.TabsList>
              <tabs_1.TabsTrigger value="list">Учётные записи</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="matrix">Матрица прав</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="org">Оргструктура</tabs_1.TabsTrigger>
            </tabs_1.TabsList>

            <tabs_1.TabsContent value="list" className="space-y-3">
              
              <div className="bg-card border border-border rounded-md shadow-card p-2 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <lucide_react_2.Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                  <input_1.Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по логину, ФИО, должности" className="h-8 pl-7 text-xs"/>
                </div>
                <select_1.Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
                  <select_1.SelectTrigger className="h-8 w-[180px] text-xs">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="all">Все роли</select_1.SelectItem>
                    {ALL_ROLES.map((r) => (<select_1.SelectItem key={r} value={r}>
                        {adminMock_1.APP_ROLE_LABEL_RU[r]}
                      </select_1.SelectItem>))}
                  </select_1.SelectContent>
                </select_1.Select>
                <select_1.Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <select_1.SelectTrigger className="h-8 w-[160px] text-xs">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="all">Все статусы</select_1.SelectItem>
                    <select_1.SelectItem value="active">Активные</select_1.SelectItem>
                    <select_1.SelectItem value="blocked">Заблокированные</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {usersLoading ? <lucide_react_1.Loader2 className="h-3 w-3 animate-spin inline mr-1"/> : null}
                  Найдено: {filtered.length} из {totalUsers}
                </span>
              </div>

              
              <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
                {usersLoading ? (<div className="flex items-center justify-center py-12">
                    <lucide_react_1.Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                    <span className="ml-2 text-xs text-muted-foreground">
                      Загрузка пользователей...
                    </span>
                  </div>) : (<div className="overflow-x-auto">
                    <table className="w-full text-xs border-separate border-spacing-0">
                      <thead className="bg-muted">
                        <tr>
                          <Th>Пользователь</Th>
                          <Th>Должность · Руководитель</Th>
                          <Th>Роли</Th>
                          <Th>Источник</Th>
                          <Th>2FA</Th>
                          <Th>Последний вход</Th>
                          <Th>Статус</Th>
                          <Th className="text-right">Действия</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((u) => {
                const emp = empById.get(u.employeeId);
                const mgr = emp?.managerId ? empById.get(emp.managerId) : undefined;
                return (<tr key={u.id} className={(0, utils_1.cn)("hover:bg-muted/30", !u.isActive && "opacity-50")}>
                              <Td>
                                <div className="font-medium text-foreground">
                                  {u.fullName || emp?.name || '—'}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {u.login} · {u.email}
                                </div>
                              </Td>
                              <Td>
                                <div>{emp?.position ?? '—'}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {mgr
                        ? `↳ ${mgr.name}`
                        : u.managerName
                            ? `↳ ${u.managerName}`
                            : 'директор'}
                                </div>
                              </Td>
                              <Td>
                                <div className="flex flex-wrap gap-1">
                                  {u.roles.map((r) => (<RoleBadge key={r} role={r}/>))}
                                </div>
                              </Td>
                              <Td>
                                <badge_1.Badge variant="outline" className={(0, utils_1.cn)('text-[10px] py-0 h-4 px-1.5', u.source === 'ldap'
                        ? 'bg-info/10 text-info border-info/30'
                        : 'bg-muted text-muted-foreground')}>
                                  {u.source === 'ldap' ? 'LDAP' : 'Локально'}
                                </badge_1.Badge>
                              </Td>
                              <Td>
                                {u.twoFactorEnabled ? (<badge_1.Badge className="bg-success/15 text-success border-success/30 text-[10px] py-0 h-4 px-1.5" variant="outline">
                                    Вкл
                                  </badge_1.Badge>) : (<span className="text-[11px] text-muted-foreground">—</span>)}
                              </Td>
                              <Td>
                                <span className="num-tabular text-[11px]">
                                  {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'никогда'}
                                </span>
                              </Td>
                              <Td>
                                <div className="flex items-center gap-2">
                                  <switch_1.Switch checked={u.isActive} onCheckedChange={() => handleToggleActive(u)} disabled={deactivateUser.isPending || updateUser.isPending}/>
                                  <span className={(0, utils_1.cn)('text-[11px]', u.isActive ? 'text-success' : 'text-warning')}>
                                    {u.isActive ? 'Активна' : 'Заблокирована'}
                                  </span>
                                </div>
                              </Td>
                              <Td className="text-right">
                                <button_1.Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditing(u)}>
                                  Изменить роли
                                </button_1.Button>
                              </Td>
                            </tr>);
            })}
                        {filtered.length === 0 && !usersLoading && (<tr>
                            <td colSpan={8} className="text-center text-muted-foreground py-6 text-xs">
                              Нет учётных записей по выбранным фильтрам
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>)}
              </div>
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="matrix">
              <PrivilegesMatrix />
            </tabs_1.TabsContent>

            <tabs_1.TabsContent value="org">
              <OrgTree />
            </tabs_1.TabsContent>
          </tabs_1.Tabs>
        </tooltip_1.TooltipProvider>

        {editing && (<EditUserDialog user={editing} dictionaries={dictData} onClose={() => setEditing(null)} onSave={handleSaveUser}/>)}
      </div>
    </AppLayout_1.AppLayout>);
};
exports.default = Users;
function Th({ children, className }) {
    return (<th className={(0, utils_1.cn)('text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1.5 border-b border-border', className)}>
      {children}
    </th>);
}
function Td({ children, className }) {
    return (<td className={(0, utils_1.cn)('px-2 py-1.5 align-top border-b border-border text-xs', className)}>
      {children}
    </td>);
}
function RoleBadge({ role }) {
    const map = {
        director: 'bg-primary/10 text-primary border-primary/30',
        admin: 'bg-destructive/10 text-destructive border-destructive/30',
        manager: 'bg-info/10 text-info border-info/30',
        business: 'bg-warning/15 text-warning border-warning/40',
        accountant: 'bg-success/10 text-success border-success/30',
        employee: 'bg-muted text-foreground border-border',
    };
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5', map[role])}>
      {adminMock_1.APP_ROLE_LABEL_RU[role]}
    </badge_1.Badge>);
}
function PrivilegesMatrix() {
    const groups = (0, react_1.useMemo)(() => {
        const m = new Map();
        for (const p of adminMock_1.PRIVILEGES) {
            const arr = m.get(p.group) ?? [];
            arr.push(p);
            m.set(p.group, arr);
        }
        return [...m.entries()];
    }, []);
    return (<div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
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
              {ALL_ROLES.map((r) => (<Th key={r} className="text-center">
                  {adminMock_1.APP_ROLE_LABEL_RU[r]}
                </Th>))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([group, items]) => (<>
                <tr key={`g-${group}`} className="bg-muted/40">
                  <td colSpan={ALL_ROLES.length + 1} className="px-2 py-1 text-[11px] font-semibold text-foreground border-b border-border">
                    {group}
                  </td>
                </tr>
                {items.map((p) => (<tr key={p.id} className="hover:bg-muted/30">
                    <Td>{p.label}</Td>
                    {ALL_ROLES.map((r) => (<Td key={r} className="text-center">
                        {p.defaultRoles.includes(r) ? (<lucide_react_2.CheckCircle2 className="h-3.5 w-3.5 text-success inline"/>) : (<span className="text-muted-foreground/40">—</span>)}
                      </Td>))}
                  </tr>))}
              </>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function OrgTree() {
    const director = timesheetsMock_1.orgEmployees.find((e) => e.id === timesheetsMock_1.DIRECTOR_ID);
    const renderNode = (emp, depth) => {
        const subs = timesheetsMock_1.orgEmployees.filter((x) => x.managerId === emp.id);
        return (<div key={emp.id}>
        <div className="flex items-center gap-2 py-1 border-b border-border text-xs" style={{ paddingLeft: 8 + depth * 16 }}>
          <span className="font-medium text-foreground">{emp.name}</span>
          <span className="text-[10px] text-muted-foreground">{emp.position}</span>
          <badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 ml-auto">
            {planningMock_1.WORK_ROLE_LABEL_RU[emp.workRole]}
          </badge_1.Badge>
          {emp.isDirector && (<badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 bg-primary/10 text-primary border-primary/30">
              директор
            </badge_1.Badge>)}
        </div>
        {subs.map((s) => renderNode(s, depth + 1))}
      </div>);
    };
    return (<div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border">
        <h2 className="text-xs font-semibold">Оргструктура (manager_id)</h2>
        <p className="text-[11px] text-muted-foreground">
          Видимость данных в системе строится по этой иерархии: руководитель видит прямых и
          косвенных подчинённых.
        </p>
      </div>
      {director && renderNode(director, 0)}
    </div>);
}
function EditUserDialog({ user, dictionaries, onClose, onSave, }) {
    const [draft, setDraft] = (0, react_1.useState)(user);
    const toggleRole = (r) => {
        setDraft({
            ...draft,
            roles: draft.roles.includes(r) ? draft.roles.filter((x) => x !== r) : [...draft.roles, r],
        });
    };
    const toggleArr = (arr, v) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    const dictProjects = dictionaries?.projects ?? planningMock_1.projects;
    const dictSystems = dictionaries?.systems ?? planningMock_1.systems;
    const dictWorkRoles = dictionaries?.workRoles ?? [];
    return (<dialog_1.Dialog open onOpenChange={(o) => !o && onClose()}>
      <dialog_1.DialogContent className="max-w-2xl">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Роли и ограничения · {draft.login}</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Назначение RBAC-ролей и ABAC-ограничений по проектам, системам и плановым направлениям
            (ТЗ §17.3).
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label_1.Label className="text-xs">RBAC-роли</label_1.Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {ALL_ROLES.map((r) => (<label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                  <checkbox_1.Checkbox checked={draft.roles.includes(r)} onCheckedChange={() => toggleRole(r)}/>
                  <span>{adminMock_1.APP_ROLE_LABEL_RU[r]}</span>
                </label>))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <switch_1.Switch checked={draft.twoFactorEnabled} onCheckedChange={(v) => setDraft({ ...draft, twoFactorEnabled: v })}/>
              <label_1.Label className="text-xs">Двухфакторная аутентификация (2FA)</label_1.Label>
            </div>
            <div className="flex items-center gap-2">
              <switch_1.Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}/>
              <label_1.Label className="text-xs">Учётная запись активна</label_1.Label>
            </div>
          </div>
          <div>
            <label_1.Label className="text-xs">ABAC: проекты (пусто = все)</label_1.Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {dictProjects.map((p) => (<label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <checkbox_1.Checkbox checked={draft.abacProjects.includes(p.id)} onCheckedChange={() => setDraft({ ...draft, abacProjects: toggleArr(draft.abacProjects, p.id) })}/>
                  <span>
                    {p.shortName ?? p.name} · {p.name}
                  </span>
                </label>))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label className="text-xs">ABAC: системы</label_1.Label>
              <div className="grid gap-1.5 mt-1.5">
                {dictSystems.map((s) => (<label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <checkbox_1.Checkbox checked={draft.abacSystems.includes(s.id)} onCheckedChange={() => setDraft({ ...draft, abacSystems: toggleArr(draft.abacSystems, s.id) })}/>
                    <span>{s.name}</span>
                  </label>))}
              </div>
            </div>
            <div>
              <label_1.Label className="text-xs">ABAC: плановые направления</label_1.Label>
              <div className="grid gap-1.5 mt-1.5">
                {dictWorkRoles.length > 0
            ? dictWorkRoles.map((r) => (<label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <checkbox_1.Checkbox checked={draft.abacRoles.includes(r.name)} onCheckedChange={() => setDraft({ ...draft, abacRoles: toggleArr(draft.abacRoles, r.name) })}/>
                        <span>{r.label}</span>
                      </label>))
            : PLANNABLE_ROLES.map((r) => (<label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                        <checkbox_1.Checkbox checked={draft.abacRoles.includes(r)} onCheckedChange={() => setDraft({ ...draft, abacRoles: toggleArr(draft.abacRoles, r) })}/>
                        <span>{planningMock_1.WORK_ROLE_LABEL_RU[r]}</span>
                      </label>))}
              </div>
            </div>
          </div>
        </div>
        <dialog_1.DialogFooter>
          <button_1.Button variant="ghost" onClick={onClose}>
            <lucide_react_2.X className="h-4 w-4"/> Отмена
          </button_1.Button>
          <button_1.Button className="bg-primary hover:bg-primary-hover" onClick={() => onSave(draft)}>
            <lucide_react_2.CheckCircle2 className="h-4 w-4"/> Сохранить
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
function fmtDateTime(iso) {
    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}
//# sourceMappingURL=Users.js.map