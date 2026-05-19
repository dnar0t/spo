"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const KpiCard_1 = require("@/components/dashboard/KpiCard");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const tabs_1 = require("@/components/ui/tabs");
const select_1 = require("@/components/ui/select");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_2 = require("lucide-react");
const useAdmin_1 = require("@/hooks/useAdmin");
const AUDIT_ACTION_LABEL_RU = {
    login: 'Вход в систему',
    logout: 'Выход из системы',
    create: 'Создание',
    update: 'Изменение',
    delete: 'Удаление',
    assign_role: 'Назначение роли',
    revoke_role: 'Отзыв роли',
    other: 'Другое',
};
const SENSITIVE_KIND_LABEL_RU = {
    salary: 'Зарплата',
    rate: 'Ставка',
    role: 'Роль',
    manager: 'Руководитель',
    permission: 'Права доступа',
};
const Audit = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const admin = (0, useAdmin_1.useAdmin)();
    const userLabel = (uid) => uid;
    const [search, setSearch] = (0, react_1.useState)('');
    const [actionFilter, setActionFilter] = (0, react_1.useState)('all');
    const [severityFilter, setSeverityFilter] = (0, react_1.useState)('all');
    const { data: auditData, isLoading: auditLoading, error: auditError, } = admin.useAuditLog({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        page: 1,
        limit: 100,
    });
    const { data: sessionsData, isLoading: sessionsLoading } = admin.useSessions();
    const { data: sensitiveData, isLoading: sensitiveLoading } = admin.useSensitiveChanges();
    const auditEvents = auditData?.data ?? [];
    const sessions = sessionsData ?? [];
    const sensitiveChanges = sensitiveData?.data ?? [];
    const filteredEvents = (0, react_1.useMemo)(() => {
        return auditEvents.filter((e) => {
            if (severityFilter !== 'all' && e.severity !== severityFilter)
                return false;
            if (search) {
                const q = search.toLowerCase();
                const hay = `${e.actorName} ${e.actorLogin} ${e.message} ${e.entityLabel ?? ''}`.toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            return true;
        });
    }, [auditEvents, search, severityFilter]);
    const stats = (0, react_1.useMemo)(() => {
        const today = Date.now() - 86_400_000;
        const last24 = auditEvents.filter((e) => new Date(e.at).getTime() > today).length;
        const warnings = auditEvents.filter((e) => e.severity !== 'info').length;
        const activeSessions = sessions.filter((s) => s.endedAt === null).length;
        const failedLogins = auditEvents.filter((e) => e.action === 'user.login_failed').length;
        return { last24, warnings, activeSessions, failedLogins };
    }, [auditEvents, sessions]);
    const exportCsv = () => {
        toast({
            title: 'Экспорт журнала',
            description: `Подготовлено ${filteredEvents.length} записей. (Демо)`,
        });
    };
    if (auditError) {
        toast({
            title: 'Ошибка загрузки журнала аудита',
            description: auditError.message || 'Не удалось получить данные.',
            variant: 'destructive',
        });
    }
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title="Аудит и безопасность" description="Доменные события, сессии пользователей и история изменений чувствительных данных. Согласно ТЗ §18: журнал неизменяемый, экспортируется для внешних аудитов." breadcrumbs={[
            { label: 'Главная' },
            { label: 'Администрирование' },
            { label: 'Аудит и безопасность' },
        ]} actions={<button_1.Button variant="outline" size="sm" onClick={exportCsv}>
            <lucide_react_2.Download className="h-4 w-4"/>
            Экспорт CSV
          </button_1.Button>}/>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard_1.KpiCard label="Событий за 24 ч" value={String(stats.last24)} unit="всего" icon={lucide_react_2.Activity} accent="primary"/>
          <KpiCard_1.KpiCard label="Активных сессий" value={String(stats.activeSessions)} unit={`из ${sessions.length}`} icon={lucide_react_2.LogIn} accent="info"/>
          <KpiCard_1.KpiCard label="Неуспешные входы" value={String(stats.failedLogins)} unit="требуют внимания" icon={lucide_react_2.ShieldAlert} accent={stats.failedLogins > 0 ? 'warning' : 'success'}/>
          <KpiCard_1.KpiCard label="Предупреждений" value={String(stats.warnings)} unit="warning + critical" icon={lucide_react_2.AlertTriangle} accent={stats.warnings > 5 ? 'warning' : 'info'}/>
        </div>

        <tabs_1.Tabs defaultValue="events" className="space-y-3">
          <tabs_1.TabsList>
            <tabs_1.TabsTrigger value="events">
              <lucide_react_2.History className="h-3.5 w-3.5 mr-1"/> Журнал событий
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="sessions">
              <lucide_react_2.LogIn className="h-3.5 w-3.5 mr-1"/> Сессии и входы
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="changes">
              <lucide_react_2.ShieldCheck className="h-3.5 w-3.5 mr-1"/> Изменения чувствительных данных
            </tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          
          <tabs_1.TabsContent value="events" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card p-2 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <lucide_react_2.Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <input_1.Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по автору, сущности, тексту" className="h-8 pl-7 text-xs"/>
              </div>
              <select_1.Select value={actionFilter} onValueChange={(v) => setActionFilter(v)}>
                <select_1.SelectTrigger className="h-8 w-[220px] text-xs">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="all">Все действия</select_1.SelectItem>
                  {Object.keys(AUDIT_ACTION_LABEL_RU).map((a) => (<select_1.SelectItem key={a} value={a}>
                      {AUDIT_ACTION_LABEL_RU[a]}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
              <select_1.Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v)}>
                <select_1.SelectTrigger className="h-8 w-[160px] text-xs">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="all">Все уровни</select_1.SelectItem>
                  <select_1.SelectItem value="info">Info</select_1.SelectItem>
                  <select_1.SelectItem value="warning">Warning</select_1.SelectItem>
                  <select_1.SelectItem value="critical">Critical</select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {auditLoading ? <lucide_react_1.Loader2 className="h-3 w-3 animate-spin inline mr-1"/> : null}
                {filteredEvents.length} из {auditData?.total ?? 0} записей
              </span>
            </div>

            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              {auditLoading ? (<div className="flex items-center justify-center py-12">
                  <lucide_react_1.Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка событий...</span>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead className="bg-muted">
                      <tr>
                        <Th className="w-[140px]">Время</Th>
                        <Th className="w-[80px]">Уровень</Th>
                        <Th className="w-[180px]">Действие</Th>
                        <Th className="w-[200px]">Автор</Th>
                        <Th>Объект / сообщение</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((e) => (<tr key={e.id} className="hover:bg-muted/30">
                          <Td className="num-tabular text-[11px]">{fmtDateTime(e.at)}</Td>
                          <Td>
                            <SeverityBadge severity={e.severity}/>
                          </Td>
                          <Td>{AUDIT_ACTION_LABEL_RU[e.action] ?? e.action}</Td>
                          <Td>{e.actorName || e.actorLogin || userLabel(e.actorUserId)}</Td>
                          <Td>
                            {e.entityType && e.entityLabel && (<div className="text-[10px] text-muted-foreground">
                                {e.entityType}: <span className="font-mono">{e.entityLabel}</span>
                              </div>)}
                            <div>{e.message}</div>
                            {e.ip && (<div className="text-[10px] text-muted-foreground mt-0.5">
                                IP {e.ip} · {e.userAgent}
                              </div>)}
                          </Td>
                        </tr>))}
                      {filteredEvents.length === 0 && !auditLoading && (<tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                            Нет записей по выбранным фильтрам
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>)}
            </div>
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="sessions">
            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <h2 className="text-xs font-semibold">Сессии пользователей</h2>
                <p className="text-[11px] text-muted-foreground">
                  Активные и завершённые сессии. Активную сессию можно отозвать (Director/Admin).
                </p>
              </div>
              {sessionsLoading ? (<div className="flex items-center justify-center py-12">
                  <lucide_react_1.Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка сессий...</span>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead className="bg-muted">
                      <tr>
                        <Th>Пользователь</Th>
                        <Th>IP · Устройство</Th>
                        <Th>Начало</Th>
                        <Th>Последняя активность</Th>
                        <Th>Статус</Th>
                        <Th className="text-right">Действия</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => {
                const active = s.endedAt === null;
                return (<tr key={s.id} className="hover:bg-muted/30">
                            <Td>{s.userName || s.userLogin}</Td>
                            <Td>
                              <div className="num-tabular">{s.ip}</div>
                              <div className="text-[10px] text-muted-foreground">{s.userAgent}</div>
                            </Td>
                            <Td className="num-tabular text-[11px]">{fmtDateTime(s.startedAt)}</Td>
                            <Td className="num-tabular text-[11px]">
                              {fmtDateTime(s.lastActivityAt)}
                            </Td>
                            <Td>
                              {active ? (<badge_1.Badge className="bg-success/15 text-success border-success/30 text-[10px] py-0 h-4 px-1.5" variant="outline">
                                  Активна
                                </badge_1.Badge>) : (<badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
                                  {s.endReason === 'logout'
                            ? 'Выход'
                            : s.endReason === 'timeout'
                                ? 'Таймаут'
                                : 'Отозвана'}
                                </badge_1.Badge>)}
                            </Td>
                            <Td className="text-right">
                              <button_1.Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!active} onClick={() => toast({
                        title: 'Сессия отозвана',
                        description: `${s.userName || s.userLogin} · ${s.ip}`,
                    })}>
                                Отозвать
                              </button_1.Button>
                            </Td>
                          </tr>);
            })}
                      {sessions.length === 0 && !sessionsLoading && (<tr>
                          <td colSpan={6} className="text-center text-muted-foreground py-6 text-xs">
                            Нет сессий
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>)}
            </div>
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="changes">
            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <h2 className="text-xs font-semibold">
                  История изменений ставок, ролей и оргструктуры
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Diff «было / стало» для критичных полей с указанием автора и причины (ТЗ §18.2).
                </p>
              </div>
              {sensitiveLoading ? (<div className="flex items-center justify-center py-12">
                  <lucide_react_1.Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка изменений...</span>
                </div>) : (<div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead className="bg-muted">
                      <tr>
                        <Th className="w-[140px]">Время</Th>
                        <Th className="w-[160px]">Категория</Th>
                        <Th>Сотрудник</Th>
                        <Th>Поле</Th>
                        <Th>Было</Th>
                        <Th>Стало</Th>
                        <Th>Автор</Th>
                        <Th>Причина</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitiveChanges.map((c) => (<tr key={c.id} className="hover:bg-muted/30">
                          <Td className="num-tabular text-[11px]">{fmtDateTime(c.at)}</Td>
                          <Td>
                            <KindBadge kind={c.kind}/>
                          </Td>
                          <Td>{c.targetEmployeeName || c.targetEmployeeId}</Td>
                          <Td>{c.field}</Td>
                          <Td className="text-warning num-tabular">{c.fromValue}</Td>
                          <Td className="text-success num-tabular font-medium">{c.toValue}</Td>
                          <Td>{c.actorName || c.actorLogin}</Td>
                          <Td className="text-muted-foreground">{c.reason ?? '—'}</Td>
                        </tr>))}
                      {sensitiveChanges.length === 0 && !sensitiveLoading && (<tr>
                          <td colSpan={8} className="text-center text-muted-foreground py-6 text-xs">
                            Нет изменений
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>)}
            </div>
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </div>
    </AppLayout_1.AppLayout>);
};
exports.default = Audit;
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
function SeverityBadge({ severity }) {
    const map = {
        info: { cls: 'bg-muted text-muted-foreground border-border', label: 'info' },
        warning: { cls: 'bg-warning/15 text-warning border-warning/40', label: 'warning' },
        critical: {
            cls: 'bg-destructive/15 text-destructive border-destructive/40',
            label: 'critical',
        },
    };
    const m = map[severity] ?? {
        cls: 'bg-muted text-muted-foreground border-border',
        label: severity,
    };
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5', m.cls)}>
      {m.label}
    </badge_1.Badge>);
}
function KindBadge({ kind }) {
    const map = {
        salary: 'bg-warning/15 text-warning border-warning/40',
        rate: 'bg-warning/15 text-warning border-warning/40',
        role: 'bg-info/10 text-info border-info/30',
        manager: 'bg-primary/10 text-primary border-primary/30',
        permission: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5', map[kind] ?? 'bg-muted text-muted-foreground')}>
      {SENSITIVE_KIND_LABEL_RU[kind] ?? kind}
    </badge_1.Badge>);
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
//# sourceMappingURL=Audit.js.map