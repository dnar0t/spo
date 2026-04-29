import { useMemo, useState, Fragment, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  ShieldAlert,
  Sigma,
  Wallet,
} from 'lucide-react';
import {
  computeBusinessSumKop,
  groupNetTotal,
  summarizeGroups,
  FINANCE_MONTHS_RU,
  type IssueGroup,
  type IssueLine,
  type SystemBucket,
} from '@/lib/finance';
import {
  BUSINESS_GRADE_LABEL,
  DEFAULT_FINANCE_SETTINGS,
  formatPct,
  formatRubInt,
  MANAGER_GRADE_LABEL,
  type BusinessGrade,
} from '@/data/salaryMock';
import { TYPE_LABEL_RU, ytIssueUrl, type IssueType } from '@/data/planningMock';
import { useFinance } from '@/hooks/useFinance';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

const BUSINESS_GRADE_OPTIONS: BusinessGrade[] = ['no_benefit', 'direct', 'obvious'];

type GradedFilter = 'all' | 'graded' | 'ungraded';

type SortKey =
  | 'id'
  | 'type'
  | 'estimate'
  | 'period'
  | 'readinessStart'
  | 'readinessPlan'
  | 'readinessFact'
  | 'planFactDiff'
  | 'plannedCost'
  | 'factCost'
  | 'businessBonus'
  | 'total';
type SortDir = 'asc' | 'desc';

const Finance = () => {
  const { toast } = useToast();
  const {
    usePeriods,
    useFinanceGroups,
    useFinanceByProject,
    useFinanceBySystem,
    useFinanceTotals,
    useFreezeFinancials,
    findPeriodByKey,
    buildPeriodOptions,
  } = useFinance();

  // API: список периодов
  const { data: periodsPage, isLoading: periodsLoading, error: periodsError } = usePeriods();
  const apiPeriods = periodsPage?.data ?? [];

  // Построить опции селектора из API
  const periodOptions = useMemo(() => {
    const opts = buildPeriodOptions(apiPeriods);
    if (opts.length === 0) return [];
    return opts;
  }, [apiPeriods, buildPeriodOptions]);

  // Ключ выбранного периода: "YYYY-MM"
  const [periodKey, setPeriodKey] = useState<string>('');
  const [year, setYear] = useState<number>(0);
  const [month, setMonth] = useState<number>(0);

  // При загрузке периодов — установить первый как текущий
  useEffect(() => {
    if (!periodKey && periodOptions.length > 0) {
      const first = periodOptions[0];
      setPeriodKey(first.value);
      setYear(first.year);
      setMonth(first.month);
    }
  }, [periodOptions, periodKey]);

  // При смене периода
  const handlePeriodChange = (key: string) => {
    setPeriodKey(key);
    const [y, m] = key.split('-').map(Number);
    setYear(y);
    setMonth(m);
  };

  // Найти ID периода по ключу
  const currentPeriod = useMemo(
    () => findPeriodByKey(apiPeriods, periodKey),
    [apiPeriods, periodKey, findPeriodByKey],
  );
  const periodId = currentPeriod?.id ?? null;

  const [approvedOnly, setApprovedOnly] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [gradedFilter, setGradedFilter] = useState<GradedFilter>('all');

  // API: финансовые группы
  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useFinanceGroups(periodId);

  // API: итоги по проектам
  const { data: apiByProject = [], isLoading: byProjectLoading } = useFinanceByProject(periodId);

  // API: итоги по системам (только агрегированные цифры, без групп)
  const { data: apiBySystem = [], isLoading: bySystemLoading } = useFinanceBySystem(periodId);

  // API: общие итоги
  const { data: totalsDto, isLoading: totalsLoading } = useFinanceTotals(periodId);

  // API: заморозка
  const freezeMutation = useFreezeFinancials();

  // Локальное состояние оценок бизнеса по группам.
  const [grades, setGrades] = useState<Record<string, BusinessGrade>>({});
  const [factReadiness, setFactReadiness] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [systemsCollapsed, setSystemsCollapsed] = useState<Record<string, boolean>>({});
  const [projectsCardOpen, setProjectsCardOpen] = useState(false);

  // Сортировка / фильтры по полям таблицы.
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<IssueType | 'all'>('all');

  const setGrade = (key: string, grade: BusinessGrade) => {
    setGrades((p) => ({ ...p, [key]: grade }));
  };
  const setFact = (key: string, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    setFactReadiness((p) => ({ ...p, [key]: v }));
  };
  const factOf = (g: { key: string; readinessPlan: number }) =>
    factReadiness[g.key] ?? g.readinessPlan;
  const toggleExpand = (key: string) => setExpanded((p) => ({ ...p, [key]: !(p[key] ?? true) }));
  const toggleSystem = (id: string) => setSystemsCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Комбинируем API данные по системам с группами для отображения
  const systemBuckets = useMemo((): SystemBucket[] => {
    if (apiBySystem.length === 0 || groups.length === 0) return [];
    // Группируем группы по systemId
    const groupsBySystem = new Map<string, IssueGroup[]>();
    for (const g of groups) {
      const sysId = g.head.systemId || '__none__';
      if (!groupsBySystem.has(sysId)) groupsBySystem.set(sysId, []);
      groupsBySystem.get(sysId)!.push(g);
    }
    // Сопоставляем с API-данными по системам
    return apiBySystem
      .map((sys) => {
        const sysGroups = groupsBySystem.get(sys.systemId) ?? [];
        return {
          ...sys,
          groups: sysGroups,
        };
      })
      .sort((a, b) => {
        if (a.systemId === '__none__') return 1;
        if (b.systemId === '__none__') return -1;
        return a.systemName.localeCompare(b.systemName);
      });
  }, [apiBySystem, groups]);

  // Пересчёт visibleGroups с учётом фильтров (теперь на основе API groups)
  const visibleGroups = useMemo(() => {
    let arr = hideEmpty ? groups.filter((g) => g.totalMinutes > 0) : groups;
    if (gradedFilter === 'graded') {
      arr = arr.filter((g) => (grades[g.key] ?? 'none') !== 'none');
    } else if (gradedFilter === 'ungraded') {
      arr = arr.filter((g) => (grades[g.key] ?? 'none') === 'none');
    }
    if (filterType !== 'all') {
      arr = arr.filter((g) => g.head.type === filterType);
    }
    const q = filterText.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (g) =>
          g.head.idReadable.toLowerCase().includes(q) ||
          g.head.summary.toLowerCase().includes(q) ||
          g.head.projectShort.toLowerCase().includes(q),
      );
    }
    // Сортировка.
    const sortVal = (g: IssueGroup): number | string => {
      const grade = grades[g.key] ?? 'none';
      const bSum = computeBusinessSumKop(g, grade);
      const fact = g.baseSumKop + g.managerSumKop + bSum;
      switch (sortKey) {
        case 'id':
          return g.head.idReadable;
        case 'type':
          return g.head.type;
        case 'estimate':
          return g.estimateHours;
        case 'period':
          return g.totalMinutes;
        case 'readinessStart':
          return g.readinessAtStart;
        case 'readinessPlan':
          return g.readinessPlan;
        case 'readinessFact':
          return factOf(g);
        case 'planFactDiff':
          return factOf(g) - g.readinessPlan;
        case 'plannedCost':
          return g.plannedCostKop;
        case 'factCost':
          return fact;
        case 'businessBonus':
          return bSum;
        case 'total':
          return fact;
      }
    };
    const sorted = [...arr].sort((a, b) => {
      const va = sortVal(a);
      const vb = sortVal(b);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [
    groups,
    hideEmpty,
    gradedFilter,
    grades,
    filterText,
    filterType,
    sortKey,
    sortDir,
    factReadiness,
  ]);

  // Сводные показатели периода (пересчитываются на основе API групп + локальных оценок)
  const totals = useMemo(() => summarizeGroups(groups, grades), [groups, grades]);

  // Данные по проектам (из API)
  const byProject = useMemo(() => {
    return apiByProject
      .filter((p) => !hideEmpty || p.totals.minutes > 0)
      .sort((a, b) => b.totals.netTotalKop - a.totals.netTotalKop);
  }, [apiByProject, hideEmpty]);

  // Название периода для отображения
  const periodLabel = useMemo(() => {
    if (year && month) {
      return `${FINANCE_MONTHS_RU[(month - 1) % 12]} ${year}`;
    }
    return '';
  }, [year, month]);

  // Проверка, закрыт ли период
  const isClosed = currentPeriod?.state === 'closed';

  // Количество неоценённых групп
  const ungradedCount = groups.filter(
    (g) => g.totalMinutes > 0 && (grades[g.key] ?? 'none') === 'none',
  ).length;

  const handleExport = () => {
    toast({
      title: 'Экспорт финансовой сводки',
      description: `${periodLabel} · CSV-файл сформирован (демо).`,
    });
  };

  const handleFreeze = () => {
    if (!periodId) return;
    freezeMutation.mutate(periodId);
  };

  // Состояние загрузки
  const isInitialLoading = periodsLoading;

  // Ошибки
  if (periodsError && !periodsLoading) {
    toast({
      title: 'Ошибка загрузки периодов',
      description: (periodsError as Error).message || 'Не удалось загрузить список периодов.',
      variant: 'destructive',
    });
  }

  if (isInitialLoading) {
    return (
      <AppLayout>
        <PageHeader
          title="Финансы"
          description="Задачи спринта с трудозатратами."
          breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-sm text-muted-foreground">Загрузка финансовых данных...</span>
        </div>
      </AppLayout>
    );
  }

  if (!periodKey && periodOptions.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Финансы"
          description="Задачи спринта с трудозатратами."
          breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]}
        />
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Нет доступных периодов для отображения.</p>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <PageHeader
        title="Финансы"
        description="Задачи спринта с трудозатратами. Бизнес выставляет оценку по каждой Истории и сиротам-задачам — итог пересчитывается с учётом премии бизнеса (ТЗ §14–16)."
        breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]}
        actions={
          <>
            <Select value={periodKey} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-7 w-40 text-xs">
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
            {isClosed && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 h-5 px-1.5 bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1"
              >
                <Lock className="h-3 w-3" /> Закрыт
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-muted">
              <ShieldAlert className="h-3 w-3 mr-1" /> Бухгалтер · Директор · Бизнес
            </Badge>
            {!isClosed && periodId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={handleFreeze}
                disabled={freezeMutation.isPending}
              >
                {freezeMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Lock className="h-3.5 w-3.5 mr-1" />
                )}
                Заморозить
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Экспорт
            </Button>
          </>
        }
      />

      <div className="p-4 space-y-3">
        {/* === KPI === */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <KpiCard
            icon={Wallet}
            label="ФОТ периода"
            value={formatRubInt(totals.netTotalKop)}
            sub={`Часов: ${Math.round(totals.minutes / 60)}`}
            tone="primary"
          />
          <KpiCard
            icon={Sigma}
            label="База"
            value={formatRubInt(totals.baseSumKop)}
            sub={`${formatPct(DEFAULT_FINANCE_SETTINGS.basePercent)} от ставки`}
          />
          <KpiCard
            icon={Coins}
            label="Премия руководителя"
            value={formatRubInt(totals.managerSumKop)}
            sub="по оценкам в табелях"
            tone="success"
          />
          <KpiCard
            icon={Coins}
            label="Премия бизнеса"
            value={formatRubInt(totals.businessSumKop)}
            sub={
              ungradedCount > 0
                ? `Не оценено историй: ${ungradedCount}`
                : 'Оценено по всем историям'
            }
            tone={ungradedCount > 0 ? 'warn' : 'success'}
          />
          <KpiCard
            icon={Sigma}
            label="Задач в спринте"
            value={String(visibleGroups.length)}
            sub={`Подзадач/сирот: ${visibleGroups.reduce((s, g) => s + Math.max(1, g.children.length), 0)}`}
          />
        </div>

        {/* === Себестоимость по проектам (сворачиваемая) === */}
        {byProject.length > 0 && (
          <div className="bg-card border border-border rounded-md shadow-card">
            <button
              type="button"
              onClick={() => setProjectsCardOpen((v) => !v)}
              className="w-full px-3 py-1.5 border-b border-border flex items-center justify-between hover:bg-muted/40 transition-colors"
              aria-expanded={projectsCardOpen}
            >
              <div className="flex items-center gap-1.5">
                {projectsCardOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <h2 className="text-xs font-semibold">Себестоимость по проектам</h2>
                <span className="text-[10px] text-muted-foreground">
                  · {byProject.length} проектов
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Период: {periodLabel}</span>
            </button>
            {projectsCardOpen && (
              <div className="px-3 py-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {byProject.map((p) => (
                  <div key={p.projectId} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{p.projectShort}</span>
                      <span className="tabular-nums font-semibold">
                        {formatRubInt(p.totals.netTotalKop)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.projectName} · {Math.round(p.totals.minutes / 60)} ч
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === Главная таблица: задачи спринта === */}
        <div className="bg-card border border-border rounded-md shadow-card">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold">Задачи спринта</h2>
              <span className="text-[10px] text-muted-foreground">· {periodLabel}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Поиск по ID / названию"
                className="h-7 w-48 text-xs"
              />
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">Тип:</Label>
                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as IssueType | 'all')}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Все
                    </SelectItem>
                    <SelectItem value="Story" className="text-xs">
                      История
                    </SelectItem>
                    <SelectItem value="Task" className="text-xs">
                      Задача
                    </SelectItem>
                    <SelectItem value="Bug" className="text-xs">
                      Ошибка
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">Оценённость:</Label>
                <Select
                  value={gradedFilter}
                  onValueChange={(v) => setGradedFilter(v as GradedFilter)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Все
                    </SelectItem>
                    <SelectItem value="graded" className="text-xs">
                      Только оценённые
                    </SelectItem>
                    <SelectItem value="ungraded" className="text-xs">
                      Только не оценённые
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="approved-only"
                  checked={approvedOnly}
                  onCheckedChange={setApprovedOnly}
                />
                <Label htmlFor="approved-only" className="text-xs">
                  Только утверждённые
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="hide-empty" checked={hideEmpty} onCheckedChange={setHideEmpty} />
                <Label htmlFor="hide-empty" className="text-xs">
                  Скрывать без часов
                </Label>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-2 py-1.5 font-medium w-7"></th>
                  <SortableTh
                    label="Задача"
                    k="id"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableTh
                    label="Тип"
                    k="type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableTh
                    label="Оц., ч"
                    k="estimate"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableTh
                    label="Период, ч"
                    k="period"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableTh
                    label="Гот. начало"
                    k="readinessStart"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Оценка готовности на начало периода (read-only, из снапшота прошлого периода)"
                  />
                  <SortableTh
                    label="Гот. план"
                    k="readinessPlan"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Плановая оценка готовности на конец периода (выставляется при планировании)"
                  />
                  <SortableTh
                    label="Гот. факт"
                    k="readinessFact"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Фактическая оценка готовности по итогам периода (выставляет менеджер/директор)"
                  />
                  <SortableTh
                    label="План/факт"
                    k="planFactDiff"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Разница: Гот. факт − Гот. план. Положительное — опережение, отрицательное — отставание."
                  />
                  <SortableTh
                    label="Себест. план"
                    k="plannedCost"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Плановая себестоимость = плановые часы × средневзвешенная базовая ставка"
                  />
                  <SortableTh
                    label="Себест. факт"
                    k="factCost"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                    title="Фактическая себестоимость = база + премия руководителя + премия бизнеса"
                  />
                  <th className="text-left px-2 py-1.5 font-medium w-44">Оценка бизнеса</th>
                  <SortableTh
                    label="Премия бизнес"
                    k="businessBonus"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableTh
                    label="Итого"
                    k="total"
                    align="right"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {systemBuckets.length === 0 && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-muted-foreground text-[11px]"
                    >
                      Нет задач за выбранный период.
                    </td>
                  </tr>
                )}
                {systemBuckets.map((bucket) => (
                  <Fragment key={bucket.systemId}>
                    <SystemHeaderRow
                      bucket={bucket}
                      collapsed={!!systemsCollapsed[bucket.systemId]}
                      onToggle={() => toggleSystem(bucket.systemId)}
                    />
                    {!systemsCollapsed[bucket.systemId] &&
                      bucket.groups.map((g) => (
                        <GroupRows
                          key={g.key}
                          group={g}
                          grade={grades[g.key] ?? 'none'}
                          onGradeChange={(v) => setGrade(g.key, v)}
                          factReadiness={factOf(g)}
                          onFactChange={(v) => setFact(g.key, v)}
                          expanded={expanded[g.key] ?? true}
                          onToggle={() => toggleExpand(g.key)}
                        />
                      ))}
                  </Fragment>
                ))}
              </tbody>
              {visibleGroups.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td colSpan={4} className="px-2 py-1.5 text-right">
                      Итого по периоду:
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {Math.round(totals.minutes / 60)}
                    </td>
                    <td colSpan={4}></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatRubInt(visibleGroups.reduce((s, g) => s + g.plannedCostKop, 0))}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatRubInt(totals.netTotalKop)}
                    </td>
                    <td></td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-warning">
                      {totals.businessSumKop > 0 ? '+' + formatRubInt(totals.businessSumKop) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatRubInt(totals.netTotalKop)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Finance;

// ====== подкомпоненты ======

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = 'left',
  title,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
  title?: string;
}) {
  const active = sortKey === k;
  return (
    <th
      className={cn(
        'px-2 py-1.5 font-medium select-none cursor-pointer hover:text-foreground transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      title={title}
      onClick={() => onClick(k)}
    >
      <span
        className={cn('inline-flex items-center gap-1', align === 'right' && 'justify-end w-full')}
      >
        {label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function SystemHeaderRow({
  bucket,
  collapsed,
  onToggle,
}: {
  bucket: SystemBucket;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tr
      className="border-t-2 border-border bg-primary/5 hover:bg-primary/10 cursor-pointer"
      onClick={onToggle}
    >
      <td className="px-2 py-1.5">
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </td>
      <td className="px-2 py-1.5 font-semibold text-foreground" colSpan={3}>
        Система: {bucket.systemName}
        <span className="ml-2 text-[10px] font-normal text-muted-foreground">
          · задач: {bucket.groups.length}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {(bucket.totalMinutes / 60).toFixed(1).replace('.', ',')}
      </td>
      {/* Гот. начало (ср.) */}
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">
        {bucket.readinessAtStartAvg}%
      </td>
      {/* Гот. план (ср.) */}
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.readinessPlanAvg}%
      </td>
      {/* Гот. факт (ср.) */}
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.readinessFactAvg}%
      </td>
      {/* План/факт (ср.) = факт − план */}
      <td
        className={cn(
          'px-2 py-1.5 text-right tabular-nums font-semibold',
          bucket.readinessFactAvg - bucket.readinessPlanAvg > 0
            ? 'text-success'
            : bucket.readinessFactAvg - bucket.readinessPlanAvg < 0
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {bucket.readinessFactAvg - bucket.readinessPlanAvg > 0 ? '+' : ''}
        {bucket.readinessFactAvg - bucket.readinessPlanAvg}%
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">
        {bucket.plannedCostKop > 0 ? formatRubInt(bucket.plannedCostKop) : '—'}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.factCostKop > 0 ? formatRubInt(bucket.factCostKop) : '—'}
      </td>
      <td></td>
      <td className="px-2 py-1.5 text-right tabular-nums text-warning font-semibold">
        {bucket.businessSumKop > 0 ? '+' + formatRubInt(bucket.businessSumKop) : '—'}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.factCostKop > 0 ? formatRubInt(bucket.factCostKop) : '—'}
      </td>
    </tr>
  );
}

function GroupRows({
  group,
  grade,
  onGradeChange,
  factReadiness,
  onFactChange,
  expanded,
  onToggle,
}: {
  group: IssueGroup;
  grade: BusinessGrade;
  onGradeChange: (g: BusinessGrade) => void;
  factReadiness: number;
  onFactChange: (v: number) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const businessSum = computeBusinessSumKop(group, grade);
  const factCostKop = group.baseSumKop + group.managerSumKop + businessSum;
  const net = groupNetTotal(group, businessSum);
  const hasChildren = group.children.length > 0;
  const isStory = group.head.type === 'Story';
  const ungraded = grade === 'none';

  return (
    <Fragment>
      <tr
        className={cn(
          'border-t border-border bg-muted/20',
          ungraded && group.totalMinutes > 0 && 'bg-warning/5',
        )}
      >
        <td className="px-2 py-1.5">
          {hasChildren ? (
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground"
              title={expanded ? 'Свернуть' : 'Развернуть'}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {group.head.projectShort}
            </span>
            <a
              href={ytIssueUrl(group.head.idReadable)}
              target="_blank"
              rel="noreferrer"
              className="text-foreground font-medium hover:text-primary inline-flex items-center gap-1 shrink-0"
            >
              {group.head.idReadable}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            {group.head.parentIdReadable ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate text-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                      {group.head.summary}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <div className="text-[11px]">
                      <div className="text-muted-foreground mb-0.5">Родитель:</div>
                      <div className="font-mono">
                        {group.head.parentIdReadable}
                        {group.head.parentType ? ` · ${TYPE_LABEL_RU[group.head.parentType]}` : ''}
                      </div>
                      {group.head.parentSummary && (
                        <div className="mt-0.5 text-foreground">{group.head.parentSummary}</div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="truncate text-foreground">{group.head.summary}</span>
            )}
            {group.head.inPlan && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 h-3.5 px-1 bg-primary/5 text-primary border-primary/30 shrink-0"
              >
                план
              </Badge>
            )}
            {!group.head.inPlan && group.head.hasWorklog && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 h-3.5 px-1 bg-muted text-muted-foreground shrink-0"
              >
                worklog
              </Badge>
            )}
          </div>
        </td>
        <td className="px-2 py-1.5">
          <IssueTypeBadge type={group.head.type} />
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">{group.estimateHours || '—'}</td>
        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
          {(group.totalMinutes / 60).toFixed(1).replace('.', ',')}
        </td>
        {/* Гот. начало (read-only) */}
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
          {group.readinessAtStart}%
        </td>
        {/* Гот. план (read-only) */}
        <td className="px-2 py-1.5 text-right tabular-nums">{group.readinessPlan}%</td>
        {/* Гот. факт (редактируется) */}
        <td className="px-2 py-1.5 text-right">
          <Input
            type="number"
            min={0}
            max={100}
            value={factReadiness}
            onChange={(e) => onFactChange(Number(e.target.value))}
            className="h-6 w-16 ml-auto text-[11px] px-1.5 text-right tabular-nums"
          />
        </td>
        {/* План/факт = факт − план */}
        {(() => {
          const diff = factReadiness - group.readinessPlan;
          return (
            <td
              className={cn(
                'px-2 py-1.5 text-right tabular-nums font-medium',
                diff > 0 ? 'text-success' : diff < 0 ? 'text-warning' : 'text-muted-foreground',
              )}
            >
              {diff > 0 ? '+' : ''}
              {diff}%
            </td>
          );
        })()}
        {/* Себест. план */}
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
          {group.plannedCostKop > 0 ? formatRubInt(group.plannedCostKop) : '—'}
        </td>
        {/* Себест. факт */}
        <td className="px-2 py-1.5 text-right tabular-nums">
          {factCostKop > 0 ? formatRubInt(factCostKop) : '—'}
        </td>
        {/* Оценка бизнеса */}
        <td className="px-2 py-1.5">
          {group.head.isGradable ? (
            <Select
              value={grade === 'none' ? undefined : grade}
              onValueChange={(v) => onGradeChange(v as BusinessGrade)}
            >
              <SelectTrigger
                className={cn(
                  'h-6 text-[11px] px-2',
                  ungraded && group.totalMinutes > 0 && 'border-warning/50 bg-warning/5',
                )}
              >
                <SelectValue placeholder="Не выставлена" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_GRADE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g} className="text-xs">
                    {BUSINESS_GRADE_LABEL[g]} ·{' '}
                    {formatPct(DEFAULT_FINANCE_SETTINGS.businessPercent[g])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums text-warning">
          {businessSum > 0 ? '+' + formatRubInt(businessSum) : '—'}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
          {net > 0 ? formatRubInt(net) : '—'}
        </td>
      </tr>

      {/* Подзадачи Истории */}
      {hasChildren &&
        expanded &&
        group.children.map((c) => (
          <SubRow key={c.idReadable} line={c} parentLabel={group.head.idReadable} />
        ))}

      {/* Контрибьюторы для сироты-задачи (раскрытие через expand state) */}
      {!hasChildren && expanded && group.head.contributions.length > 0 && (
        <ContribRow line={group.head} />
      )}

      {/* Кнопка раскрытия для сироты */}
      {!hasChildren && (
        <tr className="hidden">
          <td>
            <button onClick={onToggle} />
          </td>
        </tr>
      )}

      {/* Сноска про необходимость оценки */}
      {!isStory && !hasChildren && ungraded && group.totalMinutes > 0 && (
        <tr className="border-b border-border">
          <td colSpan={14} className="px-3 py-1 text-[10px] text-warning bg-warning/5">
            Самостоятельная задача без Истории — выставьте оценку бизнеса.
          </td>
        </tr>
      )}
      {isStory && ungraded && group.totalMinutes > 0 && (
        <tr className="border-b border-border">
          <td colSpan={14} className="px-3 py-1 text-[10px] text-warning bg-warning/5">
            История без оценки бизнеса — премия не начислена.
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function SubRow({ line, parentLabel }: { line: IssueLine; parentLabel: string }) {
  return (
    <tr className="border-t border-border/60">
      <td></td>
      <td className="px-2 py-1.5 pl-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-muted-foreground shrink-0">↳ {parentLabel}</span>
          <a
            href={ytIssueUrl(line.idReadable)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-foreground hover:text-primary inline-flex items-center gap-1 shrink-0"
          >
            {line.idReadable}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <span className="truncate text-muted-foreground">{line.summary}</span>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <IssueTypeBadge type={line.type} />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        {line.estimateHours || '—'}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {(line.minutesThisPeriod / 60).toFixed(1).replace('.', ',')}
      </td>
      {/* Гот. начало / план / факт / план-факт — на уровне Истории, в подзадачах не повторяем */}
      <td colSpan={4} className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">
        <ContribTooltip contributions={line.contributions} />
      </td>
      {/* Себест. план/факт по подзадаче не считаем отдельно — агрегируется в Истории */}
      <td colSpan={2} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        <span className="text-[10px]">входит в Историю</span>
      </td>
      <td colSpan={3}></td>
    </tr>
  );
}

function ContribRow({ line }: { line: IssueLine }) {
  return (
    <tr className="border-t border-border/60 bg-muted/10">
      <td></td>
      <td colSpan={13} className="px-2 py-1 pl-6">
        <ContribList contributions={line.contributions} />
      </td>
    </tr>
  );
}

function ContribTooltip({ contributions }: { contributions: IssueLine['contributions'] }) {
  if (contributions.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-[10px] text-muted-foreground underline decoration-dotted">
            {contributions.length} сотр.
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <ContribList contributions={contributions} compact />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ContribList({
  contributions,
  compact = false,
}: {
  contributions: IssueLine['contributions'];
  compact?: boolean;
}) {
  return (
    <ul className={cn('space-y-0.5', compact ? 'text-[11px]' : 'text-[11px]')}>
      {contributions.map((c, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="text-foreground">{c.employeeName}</span>
          <span className="text-muted-foreground">
            · {(c.minutes / 60).toFixed(1).replace('.', ',')} ч
          </span>
          <span className="text-muted-foreground">
            · оц. рук.: {MANAGER_GRADE_LABEL[c.managerGrade]}
          </span>
          {c.baseRateKop > 0 && (
            <span className="text-muted-foreground">· {formatRubInt(c.baseRateKop)}/ч</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const TYPE_TONE: Record<IssueType, string> = {
  Epic: 'bg-primary/10 text-primary border-primary/30',
  Feature: 'bg-primary/5 text-primary border-primary/20',
  Story: 'bg-success/15 text-success border-success/30',
  Task: 'bg-muted text-muted-foreground border-border',
  Bug: 'bg-destructive/15 text-destructive border-destructive/30',
};

function IssueTypeBadge({ type }: { type: IssueType }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-normal text-[10px] py-0 h-4 px-1.5', TYPE_TONE[type])}
    >
      {TYPE_LABEL_RU[type]}
    </Badge>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warn' | 'danger';
}) {
  const toneCls = {
    neutral: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warn: 'text-warning',
    danger: 'text-destructive',
  }[tone];
  return (
    <div className="bg-card border border-border rounded-md shadow-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn('text-lg font-semibold tabular-nums leading-tight mt-0.5', toneCls)}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
