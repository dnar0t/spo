// Раздел «Отчёты» (ТЗ §17 — права reports.personal / reports.team / reports.global).
//
// Три уровня отчётности с переключением вкладок. Источник данных — backend
// API модуля reporting (через хук useReports).
//
// • Личный отчёт — часы, план/факт, ЗП на руки сотрудника за период.
// • По команде — сводка по подчинённым (для руководителей и директора).
// • По компании — себестоимость по проектам / системам, статистика табелей
//   (для директора и бухгалтера).
//
// Видимость вкладок управляется ролями пользователя из useAuth.

import { useMemo, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  Coins,
  Download,
  FileSpreadsheet,
  Lock,
  Loader2,
  Sigma,
  UserCircle2,
  Users,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { useReports, type PlanningPeriodDto, type AdminUserDto } from '@/hooks/useReports';

// Стандартная норма часов в месяц (если не пришла с бэка)
const STANDARD_MONTH_HOURS = 168;

const Reports = () => {
  const { toast } = useToast();

  const {
    usePeriods,
    useEmployees,
    usePersonalReport,
    useSummaryReport,
    usePeriodStatistics,
    useSubmitManagerEvaluation,
    useSubmitBusinessEvaluation,
    useRecalculateReports,
    findPeriodByKey,
    buildPeriodOptions,
  } = useReports();

  // ---- Периоды ----
  const { data: periodsData, isLoading: periodsLoading } = usePeriods();
  const periods = periodsData ?? [];
  const periodOptions = useMemo(() => buildPeriodOptions(periods), [periods]);

  // Текущий период: по умолчанию последний доступный
  const latestPeriod = useMemo(() => {
    if (periodOptions.length === 0) return null;
    return periodOptions[0];
  }, [periodOptions]);

  const [periodKey, setPeriodKey] = useState<string>('');
  // После загрузки периодов устанавливаем значение по умолчанию
  useMemo(() => {
    if (!periodKey && latestPeriod) {
      setPeriodKey(latestPeriod.value);
    }
  }, [latestPeriod, periodKey]);

  const currentPeriod = useMemo(() => findPeriodByKey(periods, periodKey), [periods, periodKey]);
  const periodId = currentPeriod?.id ?? null;

  // ---- Пользователь ----
  const { data: employeesData } = useEmployees();
  const employees = employeesData ?? [];

  // Получаем текущего пользователя из auth (в реальном приложении useAuth)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Роли пользователя — в реальном приложении берутся из useAuth().user?.roles
  // Пока используем пустой массив — права будут определяться на бэке через ABAC
  const viewerRoles: string[] = useMemo(() => {
    return [];
  }, []);

  const isDirector = useMemo(
    () => viewerRoles.includes('director') || viewerRoles.includes('admin'),
    [viewerRoles],
  );
  const isManager = useMemo(
    () =>
      viewerRoles.includes('manager') ||
      viewerRoles.includes('director') ||
      viewerRoles.includes('admin'),
    [viewerRoles],
  );

  // Вкладки
  const canSeeTeam = isManager;
  const canSeeGlobal = isDirector;
  const [tab, setTab] = useState<'personal' | 'team' | 'global'>('personal');
  const allowedTabs = ['personal', canSeeTeam && 'team', canSeeGlobal && 'global'].filter(
    Boolean,
  ) as ('personal' | 'team' | 'global')[];
  const activeTab = allowedTabs.includes(tab) ? tab : 'personal';

  // Данные для отображения
  const periodLabel = currentPeriod
    ? `${getMonthName(currentPeriod.month)} ${currentPeriod.year}`
    : '—';
  const isClosed = currentPeriod?.state === 'closed';

  // ---- Личный отчёт ----
  const targetUserId = selectedUserId ?? 'me';
  const {
    data: personalReport,
    isLoading: personalLoading,
    isError: personalError,
  } = usePersonalReport(periodId, targetUserId === 'me' ? null : targetUserId);

  // ---- Сводный отчёт (для global вкладки) ----
  const {
    data: summaryReport,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useSummaryReport(periodId, { pageSize: 100 });

  // ---- Статистика периода ----
  const { data: periodStats, isLoading: statsLoading } = usePeriodStatistics(periodId);

  // ---- Оценки ----
  const submitManagerEval = useSubmitManagerEvaluation();
  const submitBusinessEval = useSubmitBusinessEvaluation();

  const handleSubmitManagerEvaluation = useCallback(
    (params: {
      evaluationId?: string;
      periodId: string;
      youtrackIssueId: string;
      userId: string;
      evaluationType: string;
      percent: number;
      comment?: string;
    }) => {
      submitManagerEval.mutate(params);
    },
    [submitManagerEval],
  );

  const handleSubmitBusinessEvaluation = useCallback(
    (params: {
      evaluationId?: string;
      periodId: string;
      youtrackIssueId: string;
      evaluationType: string;
      percent: number;
      comment?: string;
    }) => {
      submitBusinessEval.mutate(params);
    },
    [submitBusinessEval],
  );

  // ---- Пересчёт отчётов ----
  const recalculateMutation = useRecalculateReports();
  const handleRecalculate = useCallback(() => {
    if (periodId) {
      recalculateMutation.mutate(periodId);
    }
  }, [periodId, recalculateMutation]);

  // ---- Экспорт ----
  const handleExport = useCallback(
    (kind: string) => {
      toast({
        title: 'Экспорт отчёта',
        description: `${kind} · ${periodLabel} · Функция экспорта будет добавлена позже.`,
      });
    },
    [toast, periodLabel],
  );

  // ---- Определяем список сотрудников для селектора ----
  const employeeOptions = useMemo(() => {
    return employees
      .filter((e) => e.isActive !== false)
      .map((e) => ({
        id: e.id,
        label: e.fullName ?? e.login,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  // ---- Спиннер загрузки периодов ----
  if (periodsLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Отчёты"
          description="Загрузка данных..."
          breadcrumbs={[{ label: 'Главная' }, { label: 'Отчёты' }]}
        />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Загрузка периодов...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Отчёты"
        description="Личные, командные и сводные отчёты по часам, плану и себестоимости (ТЗ §17 — reports.personal / team / global)."
        breadcrumbs={[{ label: 'Главная' }, { label: 'Отчёты' }]}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={periodKey}
              onValueChange={(v) => {
                setPeriodKey(v);
                setSelectedUserId(null);
              }}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDirector && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecalculate}
                disabled={recalculateMutation.isPending}
              >
                {recalculateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Пересчитать
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Индикатор периода */}
        <div className="flex items-center gap-3 flex-wrap">
          {currentPeriod && (
            <Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5">
              {currentPeriod.state === 'active'
                ? 'Активен'
                : currentPeriod.state === 'closed'
                  ? 'Закрыт'
                  : currentPeriod.state}
            </Badge>
          )}
          {isClosed && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-5 px-1.5 bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1"
            >
              <Lock className="h-3 w-3" /> Период закрыт · версия данных зафиксирована
            </Badge>
          )}
          {!currentPeriod && !periodsLoading && (
            <span className="text-xs text-muted-foreground">Период не найден</span>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="personal" className="gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5" /> Личный отчёт
            </TabsTrigger>
            {canSeeTeam && (
              <TabsTrigger value="team" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> По команде
              </TabsTrigger>
            )}
            {canSeeGlobal && (
              <TabsTrigger value="global" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> По компании
              </TabsTrigger>
            )}
          </TabsList>

          {/* ========== ЛИЧНЫЙ ОТЧЁТ ========== */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">
                  {personalReport?.fullName ?? 'Личный отчёт'} · {periodLabel}
                </h2>
                {/* Селектор сотрудника (для менеджеров и директора) */}
                {isManager && (
                  <Select
                    value={selectedUserId ?? 'me'}
                    onValueChange={(v) => setSelectedUserId(v === 'me' ? null : v)}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me" className="text-xs">
                        Я (текущий пользователь)
                      </SelectItem>
                      {employeeOptions.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                          {emp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => handleExport('Личный отчёт')}>
                <Download className="h-3.5 w-3.5" /> Экспорт
              </Button>
            </div>

            {personalLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">Загрузка отчёта...</span>
              </div>
            ) : personalError || !personalReport ? (
              <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <span>Не удалось загрузить личный отчёт.</span>
                <span className="text-xs">Возможно, табель за выбранный период не создан.</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  <KpiCard
                    icon={Sigma}
                    label="Часов отработано"
                    value={personalReport.totals.totalHours.toFixed(1).replace('.', ',')}
                    unit={`Норма: ${STANDARD_MONTH_HOURS} ч`}
                  />
                  <KpiCard
                    icon={Coins}
                    label="Всего начислено"
                    value={`${(personalReport.totals.totalWithTax / 100).toLocaleString('ru-RU')} ₽`}
                    unit="с налогами"
                  />
                  <KpiCard
                    icon={Coins}
                    label="НДФЛ + Взносы"
                    value={`${((personalReport.totals.totalNdfl + personalReport.totals.totalInsurance) / 100).toLocaleString('ru-RU')} ₽`}
                    unit="удержано"
                  />
                  <KpiCard
                    icon={Wallet}
                    label="ЗП на руки"
                    value={`${(personalReport.totals.totalOnHand / 100).toLocaleString('ru-RU')} ₽`}
                    unit="База + рук. + бизн."
                    accent="primary"
                  />
                  <KpiCard
                    icon={BarChart3}
                    label="Эфф. ставка"
                    value={
                      personalReport.totals.totalHours > 0
                        ? `${(personalReport.totals.totalOnHand / 100 / personalReport.totals.totalHours).toFixed(0)} ₽/ч`
                        : '—'
                    }
                    unit="на руки / часы"
                  />
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Распределение часов по задачам</h3>
                    <Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5">
                      Строк: {personalReport.lines.length}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Задача</TableHead>
                        <TableHead className="w-[100px]">Статус</TableHead>
                        <TableHead className="text-right w-[80px]">План (ч)</TableHead>
                        <TableHead className="text-right w-[80px]">Факт (ч)</TableHead>
                        <TableHead className="text-right w-[100px]">База</TableHead>
                        <TableHead className="text-right w-[100px]">Оценка рук.</TableHead>
                        <TableHead className="text-right w-[100px]">Оценка бизн.</TableHead>
                        <TableHead className="text-right w-[110px]">На руки</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personalReport.lines.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            Нет данных за период.
                          </TableCell>
                        </TableRow>
                      )}
                      {personalReport.lines.map((r) => (
                        <TableRow key={r.issueNumber} className="h-9 [&>td]:py-1.5">
                          <TableCell className="font-mono text-xs">{r.issueNumber}</TableCell>
                          <TableCell className="text-xs">
                            <div className="line-clamp-1">{r.summary || '—'}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.stateName ?? '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular">
                            {r.estimationHours.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular">
                            {r.actualHours.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular">
                            {(r.baseAmount / 100).toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            })}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular">
                            {r.managerPercent !== null && r.managerPercent > 0
                              ? `${r.managerPercent}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular">
                            {r.businessPercent !== null && r.businessPercent > 0
                              ? `${r.businessPercent}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs num-tabular font-medium">
                            {(r.totalOnHand / 100).toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40 font-semibold text-xs">
                        <td colSpan={3} className="px-4 py-2 text-right">
                          Итого:
                        </td>
                        <td className="px-4 py-2 text-right num-tabular">
                          {personalReport.totals.totalHours.toFixed(1)}
                        </td>
                        <td />
                        <td className="px-4 py-2 text-right num-tabular">
                          {(personalReport.totals.totalBaseAmount / 100).toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            minimumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-4 py-2 text-right num-tabular">
                          {(personalReport.totals.totalManagerAmount / 100).toLocaleString(
                            'ru-RU',
                            {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            },
                          )}
                        </td>
                        <td className="px-4 py-2 text-right num-tabular">
                          {(personalReport.totals.totalBusinessAmount / 100).toLocaleString(
                            'ru-RU',
                            {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                            },
                          )}
                        </td>
                        <td className="px-4 py-2 text-right num-tabular">
                          {(personalReport.totals.totalOnHand / 100).toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            minimumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>

          {/* ========== ПО КОМАНДЕ ========== */}
          {canSeeTeam && (
            <TabsContent value="team" className="space-y-4 mt-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-base font-semibold">Команда · {periodLabel}</h2>
                <Button size="sm" variant="outline" onClick={() => handleExport('Командный отчёт')}>
                  <Download className="h-3.5 w-3.5" /> Экспорт
                </Button>
              </div>

              {summaryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground text-sm">
                    Загрузка данных команды...
                  </span>
                </div>
              ) : summaryError ? (
                <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md flex flex-col items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span>Не удалось загрузить данные команды.</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <KpiCard
                      icon={Sigma}
                      label="Часов всего (план)"
                      value={summaryReport?.statistics.totalPlannedHours.toFixed(0) ?? '—'}
                      unit="по запланированным задачам"
                    />
                    <KpiCard
                      icon={Sigma}
                      label="Часов всего (факт)"
                      value={summaryReport?.statistics.totalActualHours.toFixed(0) ?? '—'}
                      unit="по фактическим трудозатратам"
                    />
                    <KpiCard
                      icon={BarChart3}
                      label="Выполнение плана"
                      value={
                        summaryReport?.statistics.completionPercent !== undefined
                          ? `${summaryReport.statistics.completionPercent.toFixed(1)}%`
                          : '—'
                      }
                      unit={`Отклонение: ${summaryReport?.statistics.deviation.toFixed(1) ?? '—'} ч`}
                      accent="primary"
                    />
                    <KpiCard
                      icon={Loader2}
                      label="Осталось задач"
                      value={String(summaryReport?.statistics.unfinishedTasks ?? '—')}
                      unit={`осталось: ${summaryReport?.statistics.remainingHours.toFixed(1) ?? '—'} ч`}
                    />
                  </div>

                  {/* Сводка по группам (системам) */}
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">
                        Системы / Проекты
                        <span className="text-xs text-muted-foreground ml-2 font-normal">
                          ({summaryReport?.groups.length ?? 0} групп)
                        </span>
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Система</TableHead>
                          <TableHead className="text-right w-[100px]">План (ч)</TableHead>
                          <TableHead className="text-right w-[100px]">Факт (ч)</TableHead>
                          <TableHead className="text-right w-[100px]">Выполнение</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!summaryReport || summaryReport.groups.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground py-6 text-sm"
                            >
                              За период данных нет.
                            </TableCell>
                          </TableRow>
                        )}
                        {summaryReport?.groups.map((g) => {
                          const pct =
                            g.plannedHours > 0
                              ? Math.round((g.actualHours / g.plannedHours) * 100)
                              : 0;
                          return (
                            <TableRow key={g.systemName} className="h-9 [&>td]:py-1.5">
                              <TableCell className="font-medium text-sm">{g.systemName}</TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {g.plannedHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {g.actualHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                <span
                                  className={cn(
                                    pct < 50 && 'text-amber-700',
                                    pct > 100 && 'text-rose-700',
                                  )}
                                >
                                  {pct}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Сотрудники */}
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">Сотрудники по объёму работ</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Сотрудник</TableHead>
                          <TableHead className="text-right w-[100px]">Часы</TableHead>
                          <TableHead className="text-right w-[120px]">ЗП на руки</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeOptions.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-6 text-sm"
                            >
                              За период данных нет.
                            </TableCell>
                          </TableRow>
                        )}
                        {employeeOptions.slice(0, 20).map((emp) => (
                          <TableRow
                            key={emp.id}
                            className="h-9 [&>td]:py-1.5 cursor-pointer hover:bg-muted/30"
                            onClick={() => {
                              setSelectedUserId(emp.id);
                              setTab('personal');
                            }}
                          >
                            <TableCell className="font-medium text-sm">{emp.label}</TableCell>
                            <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                              —
                            </TableCell>
                            <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                              —
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {/* ========== ПО КОМПАНИИ ========== */}
          {canSeeGlobal && (
            <TabsContent value="global" className="space-y-4 mt-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-base font-semibold">
                  Сводный отчёт по компании · {periodLabel}
                </h2>
                <Button size="sm" variant="outline" onClick={() => handleExport('Сводный отчёт')}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Экспорт
                </Button>
              </div>

              {summaryLoading || statsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground text-sm">
                    Загрузка сводного отчёта...
                  </span>
                </div>
              ) : summaryError ? (
                <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md flex flex-col items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span>Не удалось загрузить сводный отчёт.</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                    <KpiCard
                      icon={Sigma}
                      label="Часов по плану"
                      value={
                        summaryReport
                          ? summaryReport.statistics.totalPlannedHours.toFixed(0)
                          : periodStats
                            ? periodStats.totalPlannedHours.toFixed(0)
                            : '—'
                      }
                      unit="запланировано"
                    />
                    <KpiCard
                      icon={BarChart3}
                      label="Часов факт"
                      value={
                        summaryReport
                          ? summaryReport.statistics.totalActualHours.toFixed(0)
                          : periodStats
                            ? periodStats.totalActualHours.toFixed(0)
                            : '—'
                      }
                      unit="отработано"
                    />
                    <KpiCard
                      icon={Coins}
                      label="Выполнение плана"
                      value={
                        summaryReport?.statistics.completionPercent !== undefined
                          ? `${summaryReport.statistics.completionPercent.toFixed(1)}%`
                          : periodStats?.completionPercent !== undefined
                            ? `${periodStats.completionPercent.toFixed(1)}%`
                            : '—'
                      }
                      unit={
                        summaryReport
                          ? `Δ ${summaryReport.statistics.deviation.toFixed(1)} ч`
                          : periodStats
                            ? `Δ ${periodStats.deviation.toFixed(1)} ч`
                            : ''
                      }
                      accent="primary"
                    />
                    <KpiCard
                      icon={Coins}
                      label="Внеплановые"
                      value={
                        summaryReport
                          ? `${summaryReport.statistics.unplannedPercent.toFixed(0)}%`
                          : periodStats
                            ? `${periodStats.unplannedPercent.toFixed(0)}%`
                            : '—'
                      }
                      unit={
                        summaryReport
                          ? `${summaryReport.statistics.unplannedHours.toFixed(1)} ч`
                          : periodStats
                            ? `${periodStats.unplannedHours.toFixed(1)} ч`
                            : ''
                      }
                      accent="warning"
                    />
                    <KpiCard
                      icon={Users}
                      label="Незавершённые задачи"
                      value={
                        summaryReport
                          ? String(summaryReport.statistics.unfinishedTasks)
                          : periodStats
                            ? String(periodStats.unfinishedTasks)
                            : '—'
                      }
                      unit={`осталось: ${
                        summaryReport
                          ? `${summaryReport.statistics.remainingHours.toFixed(1)} ч`
                          : periodStats
                            ? `${periodStats.remainingHours.toFixed(1)} ч`
                            : ''
                      }`}
                    />
                  </div>

                  {/* Сводка по группам */}
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">
                        Сводка по системам
                        <span className="text-xs text-muted-foreground ml-2 font-normal">
                          ({summaryReport?.groups.length ?? 0} групп)
                        </span>
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Система</TableHead>
                          <TableHead className="text-right w-[80px]">Задач</TableHead>
                          <TableHead className="text-right w-[100px]">План (ч)</TableHead>
                          <TableHead className="text-right w-[100px]">Факт (ч)</TableHead>
                          <TableHead className="text-right w-[100px]">Выполнение</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!summaryReport || summaryReport.groups.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground py-6 text-sm"
                            >
                              За период данных нет.
                            </TableCell>
                          </TableRow>
                        )}
                        {summaryReport?.groups.map((g) => {
                          const pct =
                            g.plannedHours > 0
                              ? Math.round((g.actualHours / g.plannedHours) * 100)
                              : 0;
                          return (
                            <TableRow key={g.systemName} className="h-9 [&>td]:py-1.5">
                              <TableCell className="font-medium text-sm">{g.systemName}</TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {g.items.length}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {g.plannedHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {g.actualHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                <span
                                  className={cn(
                                    'font-medium',
                                    pct < 50 && 'text-amber-700',
                                    pct > 100 && 'text-rose-700',
                                  )}
                                >
                                  {pct}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Детальная таблица по задачам */}
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">
                        Детализация по задачам
                        <span className="text-xs text-muted-foreground ml-2 font-normal">
                          (всего: {summaryReport?.total ?? 0})
                        </span>
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Задача</TableHead>
                          <TableHead className="w-[100px]">Система</TableHead>
                          <TableHead className="text-right w-[80px]">План (ч)</TableHead>
                          <TableHead className="text-right w-[80px]">Факт (ч)</TableHead>
                          <TableHead className="text-right w-[80px]">Остаток</TableHead>
                          <TableHead className="text-right w-[100px]">Cost план</TableHead>
                          <TableHead className="text-right w-[100px]">Cost факт</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!summaryReport || summaryReport.groups.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground py-6 text-sm"
                            >
                              За период данных нет.
                            </TableCell>
                          </TableRow>
                        )}
                        {summaryReport?.groups.map((g) =>
                          g.items.map((item) => (
                            <TableRow key={item.issueNumber} className="h-9 [&>td]:py-1.5">
                              <TableCell className="font-mono text-xs">
                                {item.issueNumber}
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="line-clamp-1">{item.summary || '—'}</div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {g.systemName}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {item.plannedHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {item.actualHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {item.remainingHours.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {item.plannedCost !== null
                                  ? `${(item.plannedCost / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}`
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right text-xs num-tabular">
                                {item.actualCost !== null
                                  ? `${(item.actualCost / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}`
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          )),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

/** Хелпер: русское название месяца */
function getMonthName(m: number): string {
  const names = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  return names[m - 1] ?? '—';
}

export default Reports;
