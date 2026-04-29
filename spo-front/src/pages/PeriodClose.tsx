import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  History,
  Loader2,
  Lock,
  LockOpen,
  ShieldAlert,
  Snowflake,
  XCircle,
} from 'lucide-react';
import { MONTHS_FULL_RU, PERIOD_STATUS_LABEL_RU, type PeriodStatus } from '@/data/periodCloseMock';
import { TIMESHEET_STATUS_LABEL_RU, type TimesheetStatus } from '@/data/timesheetsMock';
import { formatRubInt } from '@/data/salaryMock';
import { usePeriodClose, type ChecklistItemDto } from '@/hooks/usePeriodClose';
import type { PlanningPeriodDto } from '@/hooks/usePlanning';

const PeriodClose = () => {
  const { toast } = useToast();

  // Хуки API
  const {
    usePeriods,
    usePeriodReadiness,
    useClosePeriod,
    useReopenPeriod,
    useSnapshotStatus,
    useSnapshot,
    usePeriodStatistics,
  } = usePeriodClose();

  const [periodId, setPeriodId] = useState<string>('');
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Загрузка периодов
  const periodsQuery = usePeriods();
  const periods = periodsQuery.data?.data ?? [];

  // При первой загрузке выбираем первый период
  useEffect(() => {
    if (!periodId && periods.length > 0) {
      setPeriodId(periods[0].id);
    }
  }, [periods, periodId]);

  // Текущий период
  const currentPeriod = periods.find((p) => p.id === periodId) ?? null;

  // Чек-лист готовности
  const readinessQuery = usePeriodReadiness(periodId || null);
  const readiness = readinessQuery.data;

  // Статус снэпшота
  const snapshotStatusQuery = useSnapshotStatus(periodId || null);
  const snapshotStatus = snapshotStatusQuery.data;

  // Данные снэпшота (если есть)
  const snapshotQuery = useSnapshot(snapshotStatus?.hasSnapshot ? periodId || null : null);
  const snapData = snapshotQuery.data;

  // Статистика периода
  const statisticsQuery = usePeriodStatistics(periodId || null);
  const statistics = statisticsQuery.data;

  // Мутации
  const closeMutation = useClosePeriod();
  const reopenMutation = useReopenPeriod();

  const isReadinessLoading = readinessQuery.isLoading;
  const isSnapshotLoading = snapshotQuery.isLoading;
  const isPeriodsLoading = periodsQuery.isLoading;

  const status: PeriodStatus = readiness?.status ?? 'open';

  const okCount = readiness?.items.filter((i) => i.status === 'ok').length ?? 0;
  const blockerCount =
    readiness?.items.filter((i) => i.blocking && i.status === 'fail').length ?? 0;
  const warnCount = readiness?.items.filter((i) => i.status === 'warn').length ?? 0;
  const canClose = status === 'ready' && blockerCount === 0;

  // Сотрудники проблемных пунктов чек-листа — для подсветки в таблице.
  const problemEmployeeIds = useMemo(() => {
    if (!readiness) return new Set<string>();
    const set = new Set<string>();
    for (const item of readiness.items) {
      if (item.status !== 'ok' && item.problemEmployeeIds) {
        item.problemEmployeeIds.forEach((id) => set.add(id));
      }
    }
    return set;
  }, [readiness]);

  // Сотрудники для таблицы — из данных readiness.
  const periodEmployees = useMemo(() => {
    if (!readiness) return [];
    const allIds = new Set<string>();
    for (const item of readiness.items) {
      if (item.problemEmployeeIds) {
        item.problemEmployeeIds.forEach((id) => allIds.add(id));
      }
    }
    if (readiness.missingTimesheetEmployeeIds) {
      readiness.missingTimesheetEmployeeIds.forEach((id) => allIds.add(id));
    }
    return Array.from(allIds).map((id) => ({
      id,
      name: id,
      status: 'draft' as TimesheetStatus,
      hasTimesheet: false,
      hours: 0,
      managerName: '—',
    }));
  }, [readiness]);

  const filteredEmployees = showOnlyProblems
    ? periodEmployees.filter((r) => problemEmployeeIds.has(r.id))
    : periodEmployees;

  const handleClose = () => {
    if (!periodId) return;
    closeMutation.mutate(
      { periodId },
      {
        onSuccess: () => {
          setCloseOpen(false);
        },
      },
    );
  };

  const handleReopen = () => {
    if (!periodId) return;
    if (reopenReason.trim().length < 5) {
      toast({
        title: 'Укажите причину переоткрытия',
        description: 'Минимум 5 символов. Действие будет записано в журнал аудита.',
        variant: 'destructive',
      });
      return;
    }
    reopenMutation.mutate(
      { periodId, reason: reopenReason.trim() },
      {
        onSuccess: () => {
          setReopenOpen(false);
          setReopenReason('');
        },
      },
    );
  };

  const periodLabel = currentPeriod
    ? `${MONTHS_FULL_RU[currentPeriod.month - 1]} ${currentPeriod.year}`
    : 'Выберите период';

  const [year, month] = currentPeriod ? [currentPeriod.year, currentPeriod.month] : [0, 0];

  // Определяем статус периода для PeriodStatusBadge
  const periodStatusForBadge = (p: PlanningPeriodDto): PeriodStatus => {
    if (p.state === 'PERIOD_CLOSED') return 'closed';
    if (readiness && readiness.status === 'ready') return 'ready';
    return 'open';
  };

  return (
    <AppLayout>
      <PageHeader
        title="Закрытие отчётного периода"
        description="Контролируемая фиксация месяца с созданием неизменяемого snapshot (ТЗ §11)."
        breadcrumbs={[{ label: 'Главная' }, { label: 'Закрытие периода' }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={periodId} onValueChange={setPeriodId} disabled={isPeriodsLoading}>
              <SelectTrigger className="h-8 w-44 text-xs">
                {isPeriodsLoading ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Выберите период" />
                )}
              </SelectTrigger>
              <SelectContent>
                {periods.length === 0 && !isPeriodsLoading && (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Нет доступных периодов
                  </div>
                )}
                {periods.map((p) => {
                  const label = `${MONTHS_FULL_RU[p.month - 1]} ${p.year}`;
                  const ps = periodStatusForBadge(p);
                  return (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{label}</span>
                        <PeriodStatusBadge status={ps} dense />
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <PeriodStatusBadge status={status} />
          </div>
        }
      />

      <div className="p-4 space-y-3">
        {/* === Состояние загрузки === */}
        {isReadinessLoading && !readiness && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Загрузка данных периода...</span>
          </div>
        )}

        {/* === Ошибка загрузки === */}
        {readinessQuery.isError && !isReadinessLoading && !readiness && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 text-center">
            <p className="text-sm text-destructive font-medium">
              Не удалось загрузить данные периода
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {readinessQuery.error instanceof Error
                ? readinessQuery.error.message
                : 'Проверьте подключение к серверу'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => readinessQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        )}

        {/* === KPI / итоги === */}
        {readiness && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <KpiCard
              label="Сотрудников"
              value={String(readiness.totalEmployees)}
              sub={`Период: ${periodLabel}`}
            />
            <KpiCard
              label="Утверждены"
              value={String(readiness.byStatus.approved ?? 0)}
              sub={`из ${readiness.totalEmployees}`}
              tone="success"
            />
            <KpiCard
              label="На согласовании"
              value={String(
                (readiness.byStatus.submitted ?? 0) + (readiness.byStatus.manager_approved ?? 0),
              )}
              sub="submitted + manager_approved"
              tone="warn"
            />
            <KpiCard
              label="Не отправлены"
              value={String(
                (readiness.byStatus.draft ?? 0) +
                  (readiness.missingTimesheetEmployeeIds?.length ?? 0),
              )}
              sub="draft + отсутствуют"
              tone={
                (readiness.byStatus.draft ?? 0) +
                  (readiness.missingTimesheetEmployeeIds?.length ?? 0) ===
                0
                  ? 'neutral'
                  : 'danger'
              }
            />
            <KpiCard
              label="ФОТ периода"
              value={formatRubInt(readiness.totalPayrollKopecks)}
              sub={`Часов: ${Math.round(readiness.totalMinutes / 60)}`}
            />
          </div>
        )}

        {/* === Snapshot для закрытых === */}
        {snapshotStatus?.hasSnapshot && snapData && (
          <div className="bg-card border border-border rounded-md shadow-card">
            <div className="px-3 py-2 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Snowflake className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-semibold">Immutable snapshot</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Период закрыт — данные не подлежат изменению. Любые корректировки требуют
                    переоткрытия с фиксацией в аудите.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-5 px-1.5 bg-primary/5 text-primary border-primary/30 font-mono"
              >
                {snapData.id}
              </Badge>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 px-3 py-2 text-xs">
              <SnapRow
                label="Закрыт"
                value={fmtDateTime(snapshotStatus.createdAt ?? snapData.createdAt)}
              />
              <SnapRow label="ID снэпшота" value={snapData.id} />
              <SnapRow
                label="Сотрудников"
                value={String(snapData.aggregates?.totalEmployees ?? '—')}
              />
              <SnapRow
                label="ФОТ"
                value={
                  snapData.aggregates?.totalPayrollKopecks
                    ? formatRubInt(snapData.aggregates.totalPayrollKopecks)
                    : '—'
                }
              />
            </div>
          </div>
        )}

        <Tabs defaultValue="checklist" className="space-y-3">
          <TabsList>
            <TabsTrigger value="checklist">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Чек-лист готовности
            </TabsTrigger>
            <TabsTrigger value="employees">
              <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Табели по сотрудникам
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-3.5 w-3.5 mr-1" /> История закрытий
            </TabsTrigger>
          </TabsList>

          {/* === Чек-лист === */}
          <TabsContent value="checklist" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Готовность к закрытию</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Все блокирующие требования должны быть выполнены, иначе закрытие недоступно.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Badge
                    variant="outline"
                    className="bg-success/15 text-success border-success/30 h-5 px-1.5"
                  >
                    OK · {okCount}
                  </Badge>
                  {warnCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-warning/15 text-warning border-warning/30 h-5 px-1.5"
                    >
                      Предупр. · {warnCount}
                    </Badge>
                  )}
                  {blockerCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-destructive/15 text-destructive border-destructive/30 h-5 px-1.5"
                    >
                      Блокеры · {blockerCount}
                    </Badge>
                  )}
                </div>
              </div>
              {readiness ? (
                <ul className="divide-y divide-border">
                  {readiness.items.map((it) => (
                    <ChecklistRow key={it.id} item={it} />
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Нет данных чек-листа
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              {status === 'closed' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setReopenOpen(true)}
                  disabled={reopenMutation.isPending}
                >
                  {reopenMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <LockOpen className="h-4 w-4 mr-1" />
                  )}
                  Переоткрыть период
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 bg-primary hover:bg-primary-hover"
                  onClick={() => setCloseOpen(true)}
                  disabled={!canClose || closeMutation.isPending}
                >
                  {closeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Lock className="h-4 w-4 mr-1" />
                  )}
                  Закрыть период
                </Button>
              )}
            </div>
          </TabsContent>

          {/* === Сотрудники === */}
          <TabsContent value="employees" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Состояние табелей</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Сводка по сотрудникам за {periodLabel.toLowerCase()}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="only-problems"
                    checked={showOnlyProblems}
                    onCheckedChange={setShowOnlyProblems}
                  />
                  <Label htmlFor="only-problems" className="text-xs">
                    Только проблемные ({problemEmployeeIds.size})
                  </Label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="text-left px-3 py-1.5 font-medium">Сотрудник</th>
                      <th className="text-left px-3 py-1.5 font-medium">Руководитель</th>
                      <th className="text-left px-3 py-1.5 font-medium">Статус табеля</th>
                      <th className="text-right px-3 py-1.5 font-medium">Часов</th>
                      <th className="text-left px-3 py-1.5 font-medium">Замечания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-muted-foreground text-[11px]"
                        >
                          {readiness ? (
                            <>Нет записей по фильтру. Все сотрудники прошли проверки.</>
                          ) : (
                            'Загрузите данные периода'
                          )}
                        </td>
                      </tr>
                    )}
                    {filteredEmployees.map((row) => {
                      const isProblem = problemEmployeeIds.has(row.id);
                      const issues: string[] = [];
                      if (!row.hasTimesheet) issues.push('табель не создан');
                      if (row.status === 'draft') issues.push('не отправлен');
                      if (row.status === 'submitted') issues.push('не согласован руководителем');
                      if (row.status === 'manager_approved') issues.push('не утверждён директором');
                      if (row.status === 'rejected') issues.push('отклонён');
                      return (
                        <tr
                          key={row.id}
                          className={cn('border-t border-border', isProblem && 'bg-destructive/5')}
                        >
                          <td className="px-3 py-1.5">
                            <div className="font-medium text-foreground">{row.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {row.id}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.managerName}</td>
                          <td className="px-3 py-1.5">
                            <TimesheetStatusBadge status={row.status} />
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {row.hours.toString().replace('.', ',')}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
                            {issues.length === 0 ? (
                              <span className="text-success">—</span>
                            ) : (
                              issues.join(' · ')
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* === История === */}
          <TabsContent value="history" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card">
              <div className="px-3 py-2 border-b border-border">
                <h2 className="text-sm font-semibold">Закрытые периоды</h2>
                <p className="text-[11px] text-muted-foreground">
                  Каждый snapshot неизменяем. Переоткрытие требует обоснования и фиксируется в
                  журнале аудита.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="text-left px-3 py-1.5 font-medium">Период</th>
                      <th className="text-left px-3 py-1.5 font-medium">Статус</th>
                      <th className="text-left px-3 py-1.5 font-medium">Закрыт</th>
                      <th className="text-right px-3 py-1.5 font-medium">Сотрудников</th>
                      <th className="text-right px-3 py-1.5 font-medium">Часов</th>
                      <th className="text-right px-3 py-1.5 font-medium">ФОТ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.filter((p) => p.state === 'PERIOD_CLOSED').length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-muted-foreground text-[11px]"
                        >
                          Нет закрытых периодов
                        </td>
                      </tr>
                    )}
                    {periods
                      .filter((p) => p.state === 'PERIOD_CLOSED')
                      .map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-border cursor-pointer hover:bg-muted/20"
                          onClick={() => setPeriodId(p.id)}
                        >
                          <td className="px-3 py-1.5 font-medium">
                            {MONTHS_FULL_RU[p.month - 1]} {p.year}
                          </td>
                          <td className="px-3 py-1.5">
                            <PeriodStatusBadge status="closed" dense />
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {p.closedAt ? fmtDateTime(p.closedAt) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {readiness?.totalEmployees ?? '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {readiness ? Math.round(readiness.totalMinutes / 60) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {readiness ? formatRubInt(readiness.totalPayrollKopecks) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* === Диалог закрытия === */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Закрыть период · {periodLabel}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <span className="block">
                Будет создан неизменяемый snapshot отчётного периода. После закрытия редактирование
                табелей, ставок и плана для этого месяца будет заблокировано. Доменное событие{' '}
                <code className="font-mono">period.closed</code> будет отправлено через
                Transactional Outbox.
              </span>
              {readiness && (
                <span className="block text-foreground font-medium">
                  Сотрудников: {readiness.totalEmployees} · Часов:{' '}
                  {Math.round(readiness.totalMinutes / 60)} · ФОТ:{' '}
                  {formatRubInt(readiness.totalPayrollKopecks)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={closeMutation.isPending}
              className="bg-primary hover:bg-primary-hover"
            >
              {closeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Закрытие...
                </>
              ) : (
                'Закрыть период'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Диалог переоткрытия === */}
      <AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LockOpen className="h-4 w-4 text-warning" /> Переоткрыть период · {periodLabel}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Действие доступно только директору. Причина будет записана в журнал аудита и привязана
              к snapshot. После корректировок период необходимо закрыть повторно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs">
              Причина переоткрытия <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Например: корректировка ставки сотрудника после получения данных из 1С: ЗУП."
              className="text-xs min-h-20"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReopenReason('')}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopen}
              disabled={reopenMutation.isPending || reopenReason.trim().length < 5}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              {reopenMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Переоткрытие...
                </>
              ) : (
                'Переоткрыть'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PeriodClose;

// ====== подкомпоненты ======

function KpiCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'success' | 'warn' | 'danger';
}) {
  const toneCls = {
    neutral: 'text-foreground',
    success: 'text-success',
    warn: 'text-warning',
    danger: 'text-destructive',
  }[tone];
  return (
    <div className="bg-card border border-border rounded-md shadow-card p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-semibold tabular-nums', toneCls)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItemDto }) {
  const Icon =
    item.status === 'ok' ? CheckCircle2 : item.status === 'warn' ? AlertTriangle : XCircle;
  const tone =
    item.status === 'ok'
      ? 'text-success'
      : item.status === 'warn'
        ? 'text-warning'
        : 'text-destructive';
  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', tone)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{item.label}</span>
          {!item.blocking && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-4 px-1.5 bg-muted text-muted-foreground"
            >
              не блокирующее
            </Badge>
          )}
          {item.problemCount && item.problemCount > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] py-0 h-4 px-1.5',
                item.status === 'warn'
                  ? 'bg-warning/15 text-warning border-warning/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30',
              )}
            >
              {item.problemCount} шт.
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">{item.description}</p>
        {item.detail && <p className={cn('text-[11px] mt-0.5', tone)}>{item.detail}</p>}
      </div>
    </li>
  );
}

function PeriodStatusBadge({ status, dense = false }: { status: PeriodStatus; dense?: boolean }) {
  const map: Record<PeriodStatus, { cls: string; icon: typeof CheckCircle2 }> = {
    open: {
      cls: 'bg-muted text-muted-foreground border-border',
      icon: ClipboardCheck,
    },
    ready: {
      cls: 'bg-success/15 text-success border-success/30',
      icon: CheckCircle2,
    },
    closed: {
      cls: 'bg-primary/10 text-primary border-primary/30',
      icon: Lock,
    },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal inline-flex items-center gap-1',
        dense ? 'text-[10px] py-0 h-4 px-1.5' : 'text-[11px] py-0 h-5 px-1.5',
        m.cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {PERIOD_STATUS_LABEL_RU[status]}
    </Badge>
  );
}

const TS_STATUS_TONE: Record<TimesheetStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  submitted: 'bg-warning/15 text-warning border-warning/30',
  manager_approved: 'bg-primary/10 text-primary border-primary/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-normal text-[10px] py-0 h-4 px-1.5', TS_STATUS_TONE[status])}
    >
      {TIMESHEET_STATUS_LABEL_RU[status]}
    </Badge>
  );
}

function SnapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
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
