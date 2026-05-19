"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const switch_1 = require("@/components/ui/switch");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const select_1 = require("@/components/ui/select");
const tabs_1 = require("@/components/ui/tabs");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const usePeriodClose_1 = require("@/hooks/usePeriodClose");
const finance_1 = require("@/lib/finance");
const MONTHS_FULL_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const PERIOD_STATUS_LABEL_RU = { PLANNING: 'Планирование', ACTIVE: 'Активен', CLOSING: 'Закрывается', CLOSED: 'Закрыт' };
const TIMESHEET_STATUS_LABEL_RU = { draft: 'Черновик', submitted: 'Отправлен', manager_approved: 'Утверждён руководителем', approved: 'Утверждён', rejected: 'Отклонён' };
const PeriodClose = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const { usePeriods, usePeriodReadiness, useClosePeriod, useReopenPeriod, useSnapshotStatus, useSnapshot, usePeriodStatistics, } = (0, usePeriodClose_1.usePeriodClose)();
    const [periodId, setPeriodId] = (0, react_1.useState)('');
    const [showOnlyProblems, setShowOnlyProblems] = (0, react_1.useState)(false);
    const [closeOpen, setCloseOpen] = (0, react_1.useState)(false);
    const [reopenOpen, setReopenOpen] = (0, react_1.useState)(false);
    const [reopenReason, setReopenReason] = (0, react_1.useState)('');
    const periodsQuery = usePeriods();
    const periods = periodsQuery.data?.data ?? [];
    (0, react_1.useEffect)(() => {
        if (!periodId && periods.length > 0) {
            setPeriodId(periods[0].id);
        }
    }, [periods, periodId]);
    const currentPeriod = periods.find((p) => p.id === periodId) ?? null;
    const readinessQuery = usePeriodReadiness(periodId || null);
    const readiness = readinessQuery.data;
    const snapshotStatusQuery = useSnapshotStatus(periodId || null);
    const snapshotStatus = snapshotStatusQuery.data;
    const snapshotQuery = useSnapshot(snapshotStatus?.hasSnapshot ? periodId || null : null);
    const snapData = snapshotQuery.data;
    const statisticsQuery = usePeriodStatistics(periodId || null);
    const statistics = statisticsQuery.data;
    const closeMutation = useClosePeriod();
    const reopenMutation = useReopenPeriod();
    const isReadinessLoading = readinessQuery.isLoading;
    const isSnapshotLoading = snapshotQuery.isLoading;
    const isPeriodsLoading = periodsQuery.isLoading;
    const status = readiness?.status ?? 'open';
    const okCount = readiness?.items.filter((i) => i.status === 'ok').length ?? 0;
    const blockerCount = readiness?.items.filter((i) => i.blocking && i.status === 'fail').length ?? 0;
    const warnCount = readiness?.items.filter((i) => i.status === 'warn').length ?? 0;
    const canClose = status === 'ready' && blockerCount === 0;
    const problemEmployeeIds = (0, react_1.useMemo)(() => {
        if (!readiness)
            return new Set();
        const set = new Set();
        for (const item of readiness.items) {
            if (item.status !== 'ok' && item.problemEmployeeIds) {
                item.problemEmployeeIds.forEach((id) => set.add(id));
            }
        }
        return set;
    }, [readiness]);
    const periodEmployees = (0, react_1.useMemo)(() => {
        if (!readiness)
            return [];
        const allIds = new Set();
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
            status: 'draft',
            hasTimesheet: false,
            hours: 0,
            managerName: '—',
        }));
    }, [readiness]);
    const filteredEmployees = showOnlyProblems
        ? periodEmployees.filter((r) => problemEmployeeIds.has(r.id))
        : periodEmployees;
    const handleClose = () => {
        if (!periodId)
            return;
        closeMutation.mutate({ periodId }, {
            onSuccess: () => {
                setCloseOpen(false);
            },
        });
    };
    const handleReopen = () => {
        if (!periodId)
            return;
        if (reopenReason.trim().length < 5) {
            toast({
                title: 'Укажите причину переоткрытия',
                description: 'Минимум 5 символов. Действие будет записано в журнал аудита.',
                variant: 'destructive',
            });
            return;
        }
        reopenMutation.mutate({ periodId, reason: reopenReason.trim() }, {
            onSuccess: () => {
                setReopenOpen(false);
                setReopenReason('');
            },
        });
    };
    const periodLabel = currentPeriod
        ? `${MONTHS_FULL_RU[currentPeriod.month - 1]} ${currentPeriod.year}`
        : 'Выберите период';
    const [year, month] = currentPeriod ? [currentPeriod.year, currentPeriod.month] : [0, 0];
    const periodStatusForBadge = (p) => {
        if (p.state === 'PERIOD_CLOSED')
            return 'closed';
        if (readiness && readiness.status === 'ready')
            return 'ready';
        return 'open';
    };
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title="Закрытие отчётного периода" description="Контролируемая фиксация месяца с созданием неизменяемого snapshot (ТЗ §11)." breadcrumbs={[{ label: 'Главная' }, { label: 'Закрытие периода' }]} actions={<div className="flex items-center gap-2">
            <select_1.Select value={periodId} onValueChange={setPeriodId} disabled={isPeriodsLoading}>
              <select_1.SelectTrigger className="h-8 w-44 text-xs">
                {isPeriodsLoading ? (<div className="flex items-center gap-1">
                    <lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/>
                    <span>Загрузка...</span>
                  </div>) : (<select_1.SelectValue placeholder="Выберите период"/>)}
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {periods.length === 0 && !isPeriodsLoading && (<div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Нет доступных периодов
                  </div>)}
                {periods.map((p) => {
                const label = `${MONTHS_FULL_RU[p.month - 1]} ${p.year}`;
                const ps = periodStatusForBadge(p);
                return (<select_1.SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{label}</span>
                        <PeriodStatusBadge status={ps} dense/>
                      </div>
                    </select_1.SelectItem>);
            })}
              </select_1.SelectContent>
            </select_1.Select>
            <PeriodStatusBadge status={status}/>
          </div>}/>

      <div className="p-4 space-y-3">
        
        {isReadinessLoading && !readiness && (<div className="flex items-center justify-center py-12">
            <lucide_react_1.Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
            <span className="ml-2 text-sm text-muted-foreground">Загрузка данных периода...</span>
          </div>)}

        
        {readinessQuery.isError && !isReadinessLoading && !readiness && (<div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 text-center">
            <p className="text-sm text-destructive font-medium">
              Не удалось загрузить данные периода
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {readinessQuery.error instanceof Error
                ? readinessQuery.error.message
                : 'Проверьте подключение к серверу'}
            </p>
            <button_1.Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => readinessQuery.refetch()}>
              Повторить
            </button_1.Button>
          </div>)}

        
        {readiness && (<div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <KpiCard label="Сотрудников" value={String(readiness.totalEmployees)} sub={`Период: ${periodLabel}`}/>
            <KpiCard label="Утверждены" value={String(readiness.byStatus.approved ?? 0)} sub={`из ${readiness.totalEmployees}`} tone="success"/>
            <KpiCard label="На согласовании" value={String((readiness.byStatus.submitted ?? 0) + (readiness.byStatus.manager_approved ?? 0))} sub="submitted + manager_approved" tone="warn"/>
            <KpiCard label="Не отправлены" value={String((readiness.byStatus.draft ?? 0) +
                (readiness.missingTimesheetEmployeeIds?.length ?? 0))} sub="draft + отсутствуют" tone={(readiness.byStatus.draft ?? 0) +
                (readiness.missingTimesheetEmployeeIds?.length ?? 0) ===
                0
                ? 'neutral'
                : 'danger'}/>
            <KpiCard label="ФОТ периода" value={(0, finance_1.formatRubInt)(readiness.totalPayrollKopecks)} sub={`Часов: ${Math.round(readiness.totalMinutes / 60)}`}/>
          </div>)}

        
        {snapshotStatus?.hasSnapshot && snapData && (<div className="bg-card border border-border rounded-md shadow-card">
            <div className="px-3 py-2 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <lucide_react_1.Snowflake className="h-4 w-4 text-primary shrink-0 mt-0.5"/>
                <div>
                  <h2 className="text-sm font-semibold">Immutable snapshot</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Период закрыт — данные не подлежат изменению. Любые корректировки требуют
                    переоткрытия с фиксацией в аудите.
                  </p>
                </div>
              </div>
              <badge_1.Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-primary/5 text-primary border-primary/30 font-mono">
                {snapData.id}
              </badge_1.Badge>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1.5 px-3 py-2 text-xs">
              <SnapRow label="Закрыт" value={fmtDateTime(snapshotStatus.createdAt ?? snapData.createdAt)}/>
              <SnapRow label="ID снэпшота" value={snapData.id}/>
              <SnapRow label="Сотрудников" value={String(snapData.aggregates?.totalEmployees ?? '—')}/>
              <SnapRow label="ФОТ" value={snapData.aggregates?.totalPayrollKopecks
                ? (0, finance_1.formatRubInt)(snapData.aggregates.totalPayrollKopecks)
                : '—'}/>
            </div>
          </div>)}

        <tabs_1.Tabs defaultValue="checklist" className="space-y-3">
          <tabs_1.TabsList>
            <tabs_1.TabsTrigger value="checklist">
              <lucide_react_1.ClipboardCheck className="h-3.5 w-3.5 mr-1"/> Чек-лист готовности
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="employees">
              <lucide_react_1.ShieldAlert className="h-3.5 w-3.5 mr-1"/> Табели по сотрудникам
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="history">
              <lucide_react_1.History className="h-3.5 w-3.5 mr-1"/> История закрытий
            </tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          
          <tabs_1.TabsContent value="checklist" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Готовность к закрытию</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Все блокирующие требования должны быть выполнены, иначе закрытие недоступно.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <badge_1.Badge variant="outline" className="bg-success/15 text-success border-success/30 h-5 px-1.5">
                    OK · {okCount}
                  </badge_1.Badge>
                  {warnCount > 0 && (<badge_1.Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 h-5 px-1.5">
                      Предупр. · {warnCount}
                    </badge_1.Badge>)}
                  {blockerCount > 0 && (<badge_1.Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 h-5 px-1.5">
                      Блокеры · {blockerCount}
                    </badge_1.Badge>)}
                </div>
              </div>
              {readiness ? (<ul className="divide-y divide-border">
                  {readiness.items.map((it) => (<ChecklistRow key={it.id} item={it}/>))}
                </ul>) : (<div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Нет данных чек-листа
                </div>)}
            </div>

            <div className="flex items-center justify-end gap-2">
              {status === 'closed' ? (<button_1.Button variant="outline" size="sm" className="h-8" onClick={() => setReopenOpen(true)} disabled={reopenMutation.isPending}>
                  {reopenMutation.isPending ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-1"/>) : (<lucide_react_1.LockOpen className="h-4 w-4 mr-1"/>)}
                  Переоткрыть период
                </button_1.Button>) : (<button_1.Button size="sm" className="h-8 bg-primary hover:bg-primary-hover" onClick={() => setCloseOpen(true)} disabled={!canClose || closeMutation.isPending}>
                  {closeMutation.isPending ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-1"/>) : (<lucide_react_1.Lock className="h-4 w-4 mr-1"/>)}
                  Закрыть период
                </button_1.Button>)}
            </div>
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="employees" className="space-y-3">
            <div className="bg-card border border-border rounded-md shadow-card">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Состояние табелей</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Сводка по сотрудникам за {periodLabel.toLowerCase()}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <switch_1.Switch id="only-problems" checked={showOnlyProblems} onCheckedChange={setShowOnlyProblems}/>
                  <label_1.Label htmlFor="only-problems" className="text-xs">
                    Только проблемные ({problemEmployeeIds.size})
                  </label_1.Label>
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
                    {filteredEmployees.length === 0 && (<tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-[11px]">
                          {readiness ? (<>Нет записей по фильтру. Все сотрудники прошли проверки.</>) : ('Загрузите данные периода')}
                        </td>
                      </tr>)}
                    {filteredEmployees.map((row) => {
            const isProblem = problemEmployeeIds.has(row.id);
            const issues = [];
            if (!row.hasTimesheet)
                issues.push('табель не создан');
            if (row.status === 'draft')
                issues.push('не отправлен');
            if (row.status === 'submitted')
                issues.push('не согласован руководителем');
            if (row.status === 'manager_approved')
                issues.push('не утверждён директором');
            if (row.status === 'rejected')
                issues.push('отклонён');
            return (<tr key={row.id} className={(0, utils_1.cn)('border-t border-border', isProblem && 'bg-destructive/5')}>
                          <td className="px-3 py-1.5">
                            <div className="font-medium text-foreground">{row.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {row.id}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.managerName}</td>
                          <td className="px-3 py-1.5">
                            <TimesheetStatusBadge status={row.status}/>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {row.hours.toString().replace('.', ',')}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
                            {issues.length === 0 ? (<span className="text-success">—</span>) : (issues.join(' · '))}
                          </td>
                        </tr>);
        })}
                  </tbody>
                </table>
              </div>
            </div>
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="history" className="space-y-3">
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
                    {periods.filter((p) => p.state === 'PERIOD_CLOSED').length === 0 && (<tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-[11px]">
                          Нет закрытых периодов
                        </td>
                      </tr>)}
                    {periods
            .filter((p) => p.state === 'PERIOD_CLOSED')
            .map((p) => (<tr key={p.id} className="border-t border-border cursor-pointer hover:bg-muted/20" onClick={() => setPeriodId(p.id)}>
                          <td className="px-3 py-1.5 font-medium">
                            {MONTHS_FULL_RU[p.month - 1]} {p.year}
                          </td>
                          <td className="px-3 py-1.5">
                            <PeriodStatusBadge status="closed" dense/>
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
                            {readiness ? (0, finance_1.formatRubInt)(readiness.totalPayrollKopecks) : '—'}
                          </td>
                        </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </div>

      
      <alert_dialog_1.AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle className="flex items-center gap-2">
              <lucide_react_1.Lock className="h-4 w-4 text-primary"/> Закрыть период · {periodLabel}
            </alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription className="text-xs space-y-2">
              <span className="block">
                Будет создан неизменяемый snapshot отчётного периода. После закрытия редактирование
                табелей, ставок и плана для этого месяца будет заблокировано. Доменное событие{' '}
                <code className="font-mono">period.closed</code> будет отправлено через
                Transactional Outbox.
              </span>
              {readiness && (<span className="block text-foreground font-medium">
                  Сотрудников: {readiness.totalEmployees} · Часов:{' '}
                  {Math.round(readiness.totalMinutes / 60)} · ФОТ:{' '}
                  {(0, finance_1.formatRubInt)(readiness.totalPayrollKopecks)}
                </span>)}
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel>Отмена</alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction onClick={handleClose} disabled={closeMutation.isPending} className="bg-primary hover:bg-primary-hover">
              {closeMutation.isPending ? (<>
                  <lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-1"/>
                  Закрытие...
                </>) : ('Закрыть период')}
            </alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>

      
      <alert_dialog_1.AlertDialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle className="flex items-center gap-2">
              <lucide_react_1.LockOpen className="h-4 w-4 text-warning"/> Переоткрыть период · {periodLabel}
            </alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription className="text-xs">
              Действие доступно только директору. Причина будет записана в журнал аудита и привязана
              к snapshot. После корректировок период необходимо закрыть повторно.
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <div className="space-y-1.5">
            <label_1.Label htmlFor="reason" className="text-xs">
              Причина переоткрытия <span className="text-destructive">*</span>
            </label_1.Label>
            <textarea_1.Textarea id="reason" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Например: корректировка ставки сотрудника после получения данных из 1С: ЗУП." className="text-xs min-h-20"/>
          </div>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel onClick={() => setReopenReason('')}>Отмена</alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction onClick={handleReopen} disabled={reopenMutation.isPending || reopenReason.trim().length < 5} className="bg-warning hover:bg-warning/90 text-warning-foreground">
              {reopenMutation.isPending ? (<>
                  <lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-1"/>
                  Переоткрытие...
                </>) : ('Переоткрыть')}
            </alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>
    </AppLayout_1.AppLayout>);
};
exports.default = PeriodClose;
function KpiCard({ label, value, sub, tone = 'neutral', }) {
    const toneCls = {
        neutral: 'text-foreground',
        success: 'text-success',
        warn: 'text-warning',
        danger: 'text-destructive',
    }[tone];
    return (<div className="bg-card border border-border rounded-md shadow-card p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={(0, utils_1.cn)('text-lg font-semibold tabular-nums', toneCls)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>);
}
function ChecklistRow({ item }) {
    const Icon = item.status === 'ok' ? lucide_react_1.CheckCircle2 : item.status === 'warn' ? lucide_react_1.AlertTriangle : lucide_react_1.XCircle;
    const tone = item.status === 'ok'
        ? 'text-success'
        : item.status === 'warn'
            ? 'text-warning'
            : 'text-destructive';
    return (<li className="flex items-start gap-3 px-3 py-2">
      <Icon className={(0, utils_1.cn)('h-4 w-4 shrink-0 mt-0.5', tone)}/>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{item.label}</span>
          {!item.blocking && (<badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 bg-muted text-muted-foreground">
              не блокирующее
            </badge_1.Badge>)}
          {item.problemCount && item.problemCount > 0 ? (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('text-[10px] py-0 h-4 px-1.5', item.status === 'warn'
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-destructive/15 text-destructive border-destructive/30')}>
              {item.problemCount} шт.
            </badge_1.Badge>) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">{item.description}</p>
        {item.detail && <p className={(0, utils_1.cn)('text-[11px] mt-0.5', tone)}>{item.detail}</p>}
      </div>
    </li>);
}
function PeriodStatusBadge({ status, dense = false }) {
    const map = {
        open: {
            cls: 'bg-muted text-muted-foreground border-border',
            icon: lucide_react_1.ClipboardCheck,
        },
        ready: {
            cls: 'bg-success/15 text-success border-success/30',
            icon: lucide_react_1.CheckCircle2,
        },
        closed: {
            cls: 'bg-primary/10 text-primary border-primary/30',
            icon: lucide_react_1.Lock,
        },
    };
    const m = map[status];
    const Icon = m.icon;
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal inline-flex items-center gap-1', dense ? 'text-[10px] py-0 h-4 px-1.5' : 'text-[11px] py-0 h-5 px-1.5', m.cls)}>
      <Icon className="h-3 w-3"/>
      {PERIOD_STATUS_LABEL_RU[status]}
    </badge_1.Badge>);
}
const TS_STATUS_TONE = {
    draft: 'bg-muted text-muted-foreground border-border',
    submitted: 'bg-warning/15 text-warning border-warning/30',
    manager_approved: 'bg-primary/10 text-primary border-primary/30',
    approved: 'bg-success/15 text-success border-success/30',
    rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};
function TimesheetStatusBadge({ status }) {
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5', TS_STATUS_TONE[status])}>
      {TIMESHEET_STATUS_LABEL_RU[status]}
    </badge_1.Badge>);
}
function SnapRow({ label, value }) {
    return (<div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>);
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
//# sourceMappingURL=PeriodClose.js.map