import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Activity,
  AlertTriangle,
  Download,
  History,
  LogIn,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  appUsers,
  AUDIT_ACTION_LABEL_RU,
  SENSITIVE_KIND_LABEL_RU,
  type AuditAction,
} from '@/data/adminMock';
import { orgEmployees } from '@/data/timesheetsMock';
import {
  useAdmin,
  type AuditEventDto,
  type UserSessionDto,
  type SensitiveChangeDto,
} from '@/hooks/useAdmin';

const Audit = () => {
  const { toast } = useToast();
  const admin = useAdmin();

  const userById = useMemo(() => {
    const m = new Map(appUsers.map((u) => [u.id, u]));
    return m;
  }, []);
  const empById = useMemo(() => {
    const m = new Map(orgEmployees.map((e) => [e.id, e]));
    return m;
  }, []);

  const userLabel = (uid: string) => {
    const u = userById.get(uid);
    if (!u) return uid;
    const emp = empById.get(u.employeeId);
    return emp ? `${emp.name} (${u.login})` : u.login;
  };

  // ====== Журнал событий ======
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Запросы
  const {
    data: auditData,
    isLoading: auditLoading,
    error: auditError,
  } = admin.useAuditLog({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    page: 1,
    limit: 100,
  });
  const { data: sessionsData, isLoading: sessionsLoading } = admin.useSessions();
  const { data: sensitiveData, isLoading: sensitiveLoading } = admin.useSensitiveChanges();

  const auditEvents = auditData?.data ?? [];
  const sessions = sessionsData ?? [];
  const sensitiveChanges = sensitiveData?.data ?? [];

  // Клиентская фильтрация по severity и search
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${e.actorName} ${e.actorLogin} ${e.message} ${e.entityLabel ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditEvents, search, severityFilter]);

  const stats = useMemo(() => {
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

  // Ошибка загрузки
  if (auditError) {
    toast({
      title: 'Ошибка загрузки журнала аудита',
      description: (auditError as Error).message || 'Не удалось получить данные.',
      variant: 'destructive',
    });
  }

  return (
    <AppLayout>
      <PageHeader
        title="Аудит и безопасность"
        description="Доменные события, сессии пользователей и история изменений чувствительных данных. Согласно ТЗ §18: журнал неизменяемый, экспортируется для внешних аудитов."
        breadcrumbs={[
          { label: 'Главная' },
          { label: 'Администрирование' },
          { label: 'Аудит и безопасность' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Экспорт CSV
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard
            label="Событий за 24 ч"
            value={String(stats.last24)}
            unit="всего"
            icon={Activity}
            accent="primary"
          />
          <KpiCard
            label="Активных сессий"
            value={String(stats.activeSessions)}
            unit={`из ${sessions.length}`}
            icon={LogIn}
            accent="info"
          />
          <KpiCard
            label="Неуспешные входы"
            value={String(stats.failedLogins)}
            unit="требуют внимания"
            icon={ShieldAlert}
            accent={stats.failedLogins > 0 ? 'warning' : 'success'}
          />
          <KpiCard
            label="Предупреждений"
            value={String(stats.warnings)}
            unit="warning + critical"
            icon={AlertTriangle}
            accent={stats.warnings > 5 ? 'warning' : 'info'}
          />
        </div>

        <Tabs defaultValue="events" className="space-y-3">
          <TabsList>
            <TabsTrigger value="events">
              <History className="h-3.5 w-3.5 mr-1" /> Журнал событий
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <LogIn className="h-3.5 w-3.5 mr-1" /> Сессии и входы
            </TabsTrigger>
            <TabsTrigger value="changes">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Изменения чувствительных данных
            </TabsTrigger>
          </TabsList>

          {/* === Журнал === */}
          <TabsContent value="events" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card p-2 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по автору, сущности, тексту"
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <Select
                value={actionFilter}
                onValueChange={(v) => setActionFilter(v as typeof actionFilter)}
              >
                <SelectTrigger className="h-8 w-[220px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все действия</SelectItem>
                  {(Object.keys(AUDIT_ACTION_LABEL_RU) as AuditAction[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {AUDIT_ACTION_LABEL_RU[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v)}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {auditLoading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                {filteredEvents.length} из {auditData?.total ?? 0} записей
              </span>
            </div>

            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              {auditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка событий...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                      {filteredEvents.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/30">
                          <Td className="num-tabular text-[11px]">{fmtDateTime(e.at)}</Td>
                          <Td>
                            <SeverityBadge severity={e.severity} />
                          </Td>
                          <Td>{AUDIT_ACTION_LABEL_RU[e.action as AuditAction] ?? e.action}</Td>
                          <Td>{e.actorName || e.actorLogin || userLabel(e.actorUserId)}</Td>
                          <Td>
                            {e.entityType && e.entityLabel && (
                              <div className="text-[10px] text-muted-foreground">
                                {e.entityType}: <span className="font-mono">{e.entityLabel}</span>
                              </div>
                            )}
                            <div>{e.message}</div>
                            {e.ip && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                IP {e.ip} · {e.userAgent}
                              </div>
                            )}
                          </Td>
                        </tr>
                      ))}
                      {filteredEvents.length === 0 && !auditLoading && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center text-muted-foreground py-6 text-xs"
                          >
                            Нет записей по выбранным фильтрам
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Сессии === */}
          <TabsContent value="sessions">
            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <h2 className="text-xs font-semibold">Сессии пользователей</h2>
                <p className="text-[11px] text-muted-foreground">
                  Активные и завершённые сессии. Активную сессию можно отозвать (Director/Admin).
                </p>
              </div>
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка сессий...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                        return (
                          <tr key={s.id} className="hover:bg-muted/30">
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
                              {active ? (
                                <Badge
                                  className="bg-success/15 text-success border-success/30 text-[10px] py-0 h-4 px-1.5"
                                  variant="outline"
                                >
                                  Активна
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
                                  {s.endReason === 'logout'
                                    ? 'Выход'
                                    : s.endReason === 'timeout'
                                      ? 'Таймаут'
                                      : 'Отозвана'}
                                </Badge>
                              )}
                            </Td>
                            <Td className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                disabled={!active}
                                onClick={() =>
                                  toast({
                                    title: 'Сессия отозвана',
                                    description: `${s.userName || s.userLogin} · ${s.ip}`,
                                  })
                                }
                              >
                                Отозвать
                              </Button>
                            </Td>
                          </tr>
                        );
                      })}
                      {sessions.length === 0 && !sessionsLoading && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center text-muted-foreground py-6 text-xs"
                          >
                            Нет сессий
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Чувствительные изменения === */}
          <TabsContent value="changes">
            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <h2 className="text-xs font-semibold">
                  История изменений ставок, ролей и оргструктуры
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Diff «было / стало» для критичных полей с указанием автора и причины (ТЗ §18.2).
                </p>
              </div>
              {sensitiveLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка изменений...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                      {sensitiveChanges.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <Td className="num-tabular text-[11px]">{fmtDateTime(c.at)}</Td>
                          <Td>
                            <KindBadge kind={c.kind} />
                          </Td>
                          <Td>{c.targetEmployeeName || c.targetEmployeeId}</Td>
                          <Td>{c.field}</Td>
                          <Td className="text-warning num-tabular">{c.fromValue}</Td>
                          <Td className="text-success num-tabular font-medium">{c.toValue}</Td>
                          <Td>{c.actorName || c.actorLogin}</Td>
                          <Td className="text-muted-foreground">{c.reason ?? '—'}</Td>
                        </tr>
                      ))}
                      {sensitiveChanges.length === 0 && !sensitiveLoading && (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center text-muted-foreground py-6 text-xs"
                          >
                            Нет изменений
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Audit;

// ====== подкомпоненты ======

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

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string; label: string }> = {
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
  return (
    <Badge variant="outline" className={cn('font-normal text-[10px] py-0 h-4 px-1.5', m.cls)}>
      {m.label}
    </Badge>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    salary: 'bg-warning/15 text-warning border-warning/40',
    rate: 'bg-warning/15 text-warning border-warning/40',
    role: 'bg-info/10 text-info border-info/30',
    manager: 'bg-primary/10 text-primary border-primary/30',
    permission: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal text-[10px] py-0 h-4 px-1.5',
        map[kind] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {SENSITIVE_KIND_LABEL_RU[kind as keyof typeof SENSITIVE_KIND_LABEL_RU] ?? kind}
    </Badge>
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
