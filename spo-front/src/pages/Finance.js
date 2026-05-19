"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const switch_1 = require("@/components/ui/switch");
const label_1 = require("@/components/ui/label");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const tooltip_1 = require("@/components/ui/tooltip");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const finance_1 = require("@/lib/finance");
const useFinance_1 = require("@/hooks/useFinance");
const lucide_react_2 = require("lucide-react");
const BUSINESS_GRADE_OPTIONS = ['no_benefit', 'direct', 'obvious'];
const Finance = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const { usePeriods, useFinanceGroups, useFinanceByProject, useFinanceBySystem, useFinanceTotals, useFreezeFinancials, findPeriodByKey, buildPeriodOptions, } = (0, useFinance_1.useFinance)();
    const { data: periodsPage, isLoading: periodsLoading, error: periodsError } = usePeriods();
    const apiPeriods = periodsPage?.data ?? [];
    const periodOptions = (0, react_1.useMemo)(() => {
        const opts = buildPeriodOptions(apiPeriods);
        if (opts.length === 0)
            return [];
        return opts;
    }, [apiPeriods, buildPeriodOptions]);
    const [periodKey, setPeriodKey] = (0, react_1.useState)('');
    const [year, setYear] = (0, react_1.useState)(0);
    const [month, setMonth] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (!periodKey && periodOptions.length > 0) {
            const first = periodOptions[0];
            setPeriodKey(first.value);
            setYear(first.year);
            setMonth(first.month);
        }
    }, [periodOptions, periodKey]);
    const handlePeriodChange = (key) => {
        setPeriodKey(key);
        const [y, m] = key.split('-').map(Number);
        setYear(y);
        setMonth(m);
    };
    const currentPeriod = (0, react_1.useMemo)(() => findPeriodByKey(apiPeriods, periodKey), [apiPeriods, periodKey, findPeriodByKey]);
    const periodId = currentPeriod?.id ?? null;
    const [approvedOnly, setApprovedOnly] = (0, react_1.useState)(false);
    const [hideEmpty, setHideEmpty] = (0, react_1.useState)(true);
    const [gradedFilter, setGradedFilter] = (0, react_1.useState)('all');
    const { data: groups = [], isLoading: groupsLoading, error: groupsError, } = useFinanceGroups(periodId);
    const { data: apiByProject = [], isLoading: byProjectLoading } = useFinanceByProject(periodId);
    const { data: apiBySystem = [], isLoading: bySystemLoading } = useFinanceBySystem(periodId);
    const { data: totalsDto, isLoading: totalsLoading } = useFinanceTotals(periodId);
    const freezeMutation = useFreezeFinancials();
    const [grades, setGrades] = (0, react_1.useState)({});
    const [factReadiness, setFactReadiness] = (0, react_1.useState)({});
    const [expanded, setExpanded] = (0, react_1.useState)({});
    const [systemsCollapsed, setSystemsCollapsed] = (0, react_1.useState)({});
    const [projectsCardOpen, setProjectsCardOpen] = (0, react_1.useState)(false);
    const [sortKey, setSortKey] = (0, react_1.useState)('id');
    const [sortDir, setSortDir] = (0, react_1.useState)('asc');
    const [filterText, setFilterText] = (0, react_1.useState)('');
    const [filterType, setFilterType] = (0, react_1.useState)('all');
    const setGrade = (key, grade) => {
        setGrades((p) => ({ ...p, [key]: grade }));
    };
    const setFact = (key, value) => {
        const v = Math.max(0, Math.min(100, Math.round(value)));
        setFactReadiness((p) => ({ ...p, [key]: v }));
    };
    const factOf = (g) => factReadiness[g.key] ?? g.readinessPlan;
    const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !(p[key] ?? true) }));
    const toggleSystem = (id) => setSystemsCollapsed((p) => ({ ...p, [id]: !p[id] }));
    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        }
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    };
    const systemBuckets = (0, react_1.useMemo)(() => {
        if (apiBySystem.length === 0 || groups.length === 0)
            return [];
        const groupsBySystem = new Map();
        for (const g of groups) {
            const sysId = g.head.systemId || '__none__';
            if (!groupsBySystem.has(sysId))
                groupsBySystem.set(sysId, []);
            groupsBySystem.get(sysId).push(g);
        }
        return apiBySystem
            .map((sys) => {
            const sysGroups = groupsBySystem.get(sys.systemId) ?? [];
            return {
                ...sys,
                groups: sysGroups,
            };
        })
            .sort((a, b) => {
            if (a.systemId === '__none__')
                return 1;
            if (b.systemId === '__none__')
                return -1;
            return a.systemName.localeCompare(b.systemName);
        });
    }, [apiBySystem, groups]);
    const visibleGroups = (0, react_1.useMemo)(() => {
        let arr = hideEmpty ? groups.filter((g) => g.totalMinutes > 0) : groups;
        if (gradedFilter === 'graded') {
            arr = arr.filter((g) => (grades[g.key] ?? 'none') !== 'none');
        }
        else if (gradedFilter === 'ungraded') {
            arr = arr.filter((g) => (grades[g.key] ?? 'none') === 'none');
        }
        if (filterType !== 'all') {
            arr = arr.filter((g) => g.head.type === filterType);
        }
        const q = filterText.trim().toLowerCase();
        if (q) {
            arr = arr.filter((g) => g.head.idReadable.toLowerCase().includes(q) ||
                g.head.summary.toLowerCase().includes(q) ||
                g.head.projectShort.toLowerCase().includes(q));
        }
        const sortVal = (g) => {
            const grade = grades[g.key] ?? 'none';
            const bSum = (0, finance_1.computeBusinessSumKop)(g, grade);
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
            if (typeof va === 'number' && typeof vb === 'number')
                cmp = va - vb;
            else
                cmp = String(va).localeCompare(String(vb));
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
    const totals = (0, react_1.useMemo)(() => (0, finance_1.summarizeGroups)(groups, grades), [groups, grades]);
    const byProject = (0, react_1.useMemo)(() => {
        return apiByProject
            .filter((p) => !hideEmpty || p.totals.minutes > 0)
            .sort((a, b) => b.totals.netTotalKop - a.totals.netTotalKop);
    }, [apiByProject, hideEmpty]);
    const periodLabel = (0, react_1.useMemo)(() => {
        if (year && month) {
            return `${finance_1.FINANCE_MONTHS_RU[(month - 1) % 12]} ${year}`;
        }
        return '';
    }, [year, month]);
    const isClosed = currentPeriod?.state === 'closed';
    const ungradedCount = groups.filter((g) => g.totalMinutes > 0 && (grades[g.key] ?? 'none') === 'none').length;
    const handleExport = () => {
        toast({
            title: 'Экспорт финансовой сводки',
            description: `${periodLabel} · CSV-файл сформирован (демо).`,
        });
    };
    const handleFreeze = () => {
        if (!periodId)
            return;
        freezeMutation.mutate(periodId);
    };
    const isInitialLoading = periodsLoading;
    if (periodsError && !periodsLoading) {
        toast({
            title: 'Ошибка загрузки периодов',
            description: periodsError.message || 'Не удалось загрузить список периодов.',
            variant: 'destructive',
        });
    }
    if (isInitialLoading) {
        return (<AppLayout_1.AppLayout>
        <PageHeader_1.PageHeader title="Финансы" description="Задачи спринта с трудозатратами." breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]}/>
        <div className="flex items-center justify-center py-20">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
          <span className="ml-3 text-sm text-muted-foreground">Загрузка финансовых данных...</span>
        </div>
      </AppLayout_1.AppLayout>);
    }
    if (!periodKey && periodOptions.length === 0) {
        return (<AppLayout_1.AppLayout>
        <PageHeader_1.PageHeader title="Финансы" description="Задачи спринта с трудозатратами." breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]}/>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Нет доступных периодов для отображения.</p>
        </div>
      </AppLayout_1.AppLayout>);
    }
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title="Финансы" description="Задачи спринта с трудозатратами. Бизнес выставляет оценку по каждой Истории и сиротам-задачам — итог пересчитывается с учётом премии бизнеса (ТЗ §14–16)." breadcrumbs={[{ label: 'Главная' }, { label: 'Финансы' }]} actions={<>
            <select_1.Select value={periodKey} onValueChange={handlePeriodChange}>
              <select_1.SelectTrigger className="h-7 w-40 text-xs">
                <select_1.SelectValue placeholder="Выберите период"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {periodOptions.map((p) => (<select_1.SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
            {isClosed && (<badge_1.Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1">
                <lucide_react_1.Lock className="h-3 w-3"/> Закрыт
              </badge_1.Badge>)}
            <badge_1.Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-muted">
              <lucide_react_1.ShieldAlert className="h-3 w-3 mr-1"/> Бухгалтер · Директор · Бизнес
            </badge_1.Badge>
            {!isClosed && periodId && (<button_1.Button size="sm" variant="outline" className="h-7" onClick={handleFreeze} disabled={freezeMutation.isPending}>
                {freezeMutation.isPending ? (<lucide_react_1.Loader2 className="h-3.5 w-3.5 animate-spin mr-1"/>) : (<lucide_react_1.Lock className="h-3.5 w-3.5 mr-1"/>)}
                Заморозить
              </button_1.Button>)}
            <button_1.Button size="sm" variant="outline" className="h-7" onClick={handleExport}>
              <lucide_react_1.Download className="h-3.5 w-3.5"/> Экспорт
            </button_1.Button>
          </>}/>

      <div className="p-4 space-y-3">
        
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <KpiCard icon={lucide_react_1.Wallet} label="ФОТ периода" value={formatRubInt(totals.netTotalKop)} sub={`Часов: ${Math.round(totals.minutes / 60)}`} tone="primary"/>
          <KpiCard icon={lucide_react_1.Sigma} label="База" value={formatRubInt(totals.baseSumKop)} sub={`${formatPct(DEFAULT_FINANCE_SETTINGS.basePercent)} от ставки`}/>
          <KpiCard icon={lucide_react_1.Coins} label="Премия руководителя" value={formatRubInt(totals.managerSumKop)} sub="по оценкам в табелях" tone="success"/>
          <KpiCard icon={lucide_react_1.Coins} label="Премия бизнеса" value={formatRubInt(totals.businessSumKop)} sub={ungradedCount > 0
            ? `Не оценено историй: ${ungradedCount}`
            : 'Оценено по всем историям'} tone={ungradedCount > 0 ? 'warn' : 'success'}/>
          <KpiCard icon={lucide_react_1.Sigma} label="Задач в спринте" value={String(visibleGroups.length)} sub={`Подзадач/сирот: ${visibleGroups.reduce((s, g) => s + Math.max(1, g.children.length), 0)}`}/>
        </div>

        
        {byProject.length > 0 && (<div className="bg-card border border-border rounded-md shadow-card">
            <button type="button" onClick={() => setProjectsCardOpen((v) => !v)} className="w-full px-3 py-1.5 border-b border-border flex items-center justify-between hover:bg-muted/40 transition-colors" aria-expanded={projectsCardOpen}>
              <div className="flex items-center gap-1.5">
                {projectsCardOpen ? (<lucide_react_1.ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/>) : (<lucide_react_1.ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>)}
                <h2 className="text-xs font-semibold">Себестоимость по проектам</h2>
                <span className="text-[10px] text-muted-foreground">
                  · {byProject.length} проектов
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Период: {periodLabel}</span>
            </button>
            {projectsCardOpen && (<div className="px-3 py-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {byProject.map((p) => (<div key={p.projectId} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{p.projectShort}</span>
                      <span className="tabular-nums font-semibold">
                        {formatRubInt(p.totals.netTotalKop)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.projectName} · {Math.round(p.totals.minutes / 60)} ч
                    </div>
                  </div>))}
              </div>)}
          </div>)}

        
        <div className="bg-card border border-border rounded-md shadow-card">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold">Задачи спринта</h2>
              <span className="text-[10px] text-muted-foreground">· {periodLabel}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input_1.Input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Поиск по ID / названию" className="h-7 w-48 text-xs"/>
              <div className="flex items-center gap-1.5">
                <label_1.Label className="text-xs text-muted-foreground">Тип:</label_1.Label>
                <select_1.Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                  <select_1.SelectTrigger className="h-7 w-28 text-xs">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="all" className="text-xs">
                      Все
                    </select_1.SelectItem>
                    <select_1.SelectItem value="Story" className="text-xs">
                      История
                    </select_1.SelectItem>
                    <select_1.SelectItem value="Task" className="text-xs">
                      Задача
                    </select_1.SelectItem>
                    <select_1.SelectItem value="Bug" className="text-xs">
                      Ошибка
                    </select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
              <div className="flex items-center gap-1.5">
                <label_1.Label className="text-xs text-muted-foreground">Оценённость:</label_1.Label>
                <select_1.Select value={gradedFilter} onValueChange={(v) => setGradedFilter(v)}>
                  <select_1.SelectTrigger className="h-7 w-36 text-xs">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="all" className="text-xs">
                      Все
                    </select_1.SelectItem>
                    <select_1.SelectItem value="graded" className="text-xs">
                      Только оценённые
                    </select_1.SelectItem>
                    <select_1.SelectItem value="ungraded" className="text-xs">
                      Только не оценённые
                    </select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
              <div className="flex items-center gap-2">
                <switch_1.Switch id="approved-only" checked={approvedOnly} onCheckedChange={setApprovedOnly}/>
                <label_1.Label htmlFor="approved-only" className="text-xs">
                  Только утверждённые
                </label_1.Label>
              </div>
              <div className="flex items-center gap-2">
                <switch_1.Switch id="hide-empty" checked={hideEmpty} onCheckedChange={setHideEmpty}/>
                <label_1.Label htmlFor="hide-empty" className="text-xs">
                  Скрывать без часов
                </label_1.Label>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-2 py-1.5 font-medium w-7"></th>
                  <SortableTh label="Задача" k="id" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                  <SortableTh label="Тип" k="type" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                  <SortableTh label="Оц., ч" k="estimate" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                  <SortableTh label="Период, ч" k="period" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                  <SortableTh label="Гот. начало" k="readinessStart" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Оценка готовности на начало периода (read-only, из снапшота прошлого периода)"/>
                  <SortableTh label="Гот. план" k="readinessPlan" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Плановая оценка готовности на конец периода (выставляется при планировании)"/>
                  <SortableTh label="Гот. факт" k="readinessFact" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Фактическая оценка готовности по итогам периода (выставляет менеджер/директор)"/>
                  <SortableTh label="План/факт" k="planFactDiff" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Разница: Гот. факт − Гот. план. Положительное — опережение, отрицательное — отставание."/>
                  <SortableTh label="Себест. план" k="plannedCost" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Плановая себестоимость = плановые часы × средневзвешенная базовая ставка"/>
                  <SortableTh label="Себест. факт" k="factCost" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} title="Фактическая себестоимость = база + премия руководителя + премия бизнеса"/>
                  <th className="text-left px-2 py-1.5 font-medium w-44">Оценка бизнеса</th>
                  <SortableTh label="Премия бизнес" k="businessBonus" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                  <SortableTh label="Итого" k="total" align="right" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}/>
                </tr>
              </thead>
              <tbody>
                {systemBuckets.length === 0 && (<tr>
                    <td colSpan={14} className="px-3 py-6 text-center text-muted-foreground text-[11px]">
                      Нет задач за выбранный период.
                    </td>
                  </tr>)}
                {systemBuckets.map((bucket) => (<react_1.Fragment key={bucket.systemId}>
                    <SystemHeaderRow bucket={bucket} collapsed={!!systemsCollapsed[bucket.systemId]} onToggle={() => toggleSystem(bucket.systemId)}/>
                    {!systemsCollapsed[bucket.systemId] &&
                bucket.groups.map((g) => (<GroupRows key={g.key} group={g} grade={grades[g.key] ?? 'none'} onGradeChange={(v) => setGrade(g.key, v)} factReadiness={factOf(g)} onFactChange={(v) => setFact(g.key, v)} expanded={expanded[g.key] ?? true} onToggle={() => toggleExpand(g.key)}/>))}
                  </react_1.Fragment>))}
              </tbody>
              {visibleGroups.length > 0 && (<tfoot>
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
                </tfoot>)}
            </table>
          </div>
        </div>
      </div>
    </AppLayout_1.AppLayout>);
};
exports.default = Finance;
function SortableTh({ label, k, sortKey, sortDir, onClick, align = 'left', title, }) {
    const active = sortKey === k;
    return (<th className={(0, utils_1.cn)('px-2 py-1.5 font-medium select-none cursor-pointer hover:text-foreground transition-colors', align === 'right' ? 'text-right' : 'text-left')} title={title} onClick={() => onClick(k)}>
      <span className={(0, utils_1.cn)('inline-flex items-center gap-1', align === 'right' && 'justify-end w-full')}>
        {label}
        {active ? (sortDir === 'asc' ? (<lucide_react_2.ArrowUp className="h-3 w-3"/>) : (<lucide_react_2.ArrowDown className="h-3 w-3"/>)) : (<lucide_react_2.ArrowUpDown className="h-3 w-3 opacity-30"/>)}
      </span>
    </th>);
}
function SystemHeaderRow({ bucket, collapsed, onToggle, }) {
    return (<tr className="border-t-2 border-border bg-primary/5 hover:bg-primary/10 cursor-pointer" onClick={onToggle}>
      <td className="px-2 py-1.5">
        {collapsed ? (<lucide_react_1.ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>) : (<lucide_react_1.ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/>)}
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
      
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-muted-foreground">
        {bucket.readinessAtStartAvg}%
      </td>
      
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.readinessPlanAvg}%
      </td>
      
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
        {bucket.readinessFactAvg}%
      </td>
      
      <td className={(0, utils_1.cn)('px-2 py-1.5 text-right tabular-nums font-semibold', bucket.readinessFactAvg - bucket.readinessPlanAvg > 0
            ? 'text-success'
            : bucket.readinessFactAvg - bucket.readinessPlanAvg < 0
                ? 'text-warning'
                : 'text-muted-foreground')}>
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
    </tr>);
}
function GroupRows({ group, grade, onGradeChange, factReadiness, onFactChange, expanded, onToggle, }) {
    const businessSum = (0, finance_1.computeBusinessSumKop)(group, grade);
    const factCostKop = group.baseSumKop + group.managerSumKop + businessSum;
    const net = (0, finance_1.groupNetTotal)(group, businessSum);
    const hasChildren = group.children.length > 0;
    const isStory = group.head.type === 'Story';
    const ungraded = grade === 'none';
    return (<react_1.Fragment>
      <tr className={(0, utils_1.cn)('border-t border-border bg-muted/20', ungraded && group.totalMinutes > 0 && 'bg-warning/5')}>
        <td className="px-2 py-1.5">
          {hasChildren ? (<button onClick={onToggle} className="text-muted-foreground hover:text-foreground" title={expanded ? 'Свернуть' : 'Развернуть'}>
              {expanded ? (<lucide_react_1.ChevronDown className="h-3.5 w-3.5"/>) : (<lucide_react_1.ChevronRight className="h-3.5 w-3.5"/>)}
            </button>) : null}
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {group.head.projectShort}
            </span>
            <a href={ytIssueUrl(group.head.idReadable)} target="_blank" rel="noreferrer" className="text-foreground font-medium hover:text-primary inline-flex items-center gap-1 shrink-0">
              {group.head.idReadable}
              <lucide_react_1.ExternalLink className="h-3 w-3 opacity-50"/>
            </a>
            {group.head.parentIdReadable ? (<tooltip_1.TooltipProvider delayDuration={150}>
                <tooltip_1.Tooltip>
                  <tooltip_1.TooltipTrigger asChild>
                    <span className="truncate text-foreground cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                      {group.head.summary}
                    </span>
                  </tooltip_1.TooltipTrigger>
                  <tooltip_1.TooltipContent side="top" className="max-w-sm">
                    <div className="text-[11px]">
                      <div className="text-muted-foreground mb-0.5">Родитель:</div>
                      <div className="font-mono">
                        {group.head.parentIdReadable}
                        {group.head.parentType ? ` · ${TYPE_LABEL_RU[group.head.parentType]}` : ''}
                      </div>
                      {group.head.parentSummary && (<div className="mt-0.5 text-foreground">{group.head.parentSummary}</div>)}
                    </div>
                  </tooltip_1.TooltipContent>
                </tooltip_1.Tooltip>
              </tooltip_1.TooltipProvider>) : (<span className="truncate text-foreground">{group.head.summary}</span>)}
            {group.head.inPlan && (<badge_1.Badge variant="outline" className="text-[9px] py-0 h-3.5 px-1 bg-primary/5 text-primary border-primary/30 shrink-0">
                план
              </badge_1.Badge>)}
            {!group.head.inPlan && group.head.hasWorklog && (<badge_1.Badge variant="outline" className="text-[9px] py-0 h-3.5 px-1 bg-muted text-muted-foreground shrink-0">
                worklog
              </badge_1.Badge>)}
          </div>
        </td>
        <td className="px-2 py-1.5">
          <IssueTypeBadge type={group.head.type}/>
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">{group.estimateHours || '—'}</td>
        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
          {(group.totalMinutes / 60).toFixed(1).replace('.', ',')}
        </td>
        
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
          {group.readinessAtStart}%
        </td>
        
        <td className="px-2 py-1.5 text-right tabular-nums">{group.readinessPlan}%</td>
        
        <td className="px-2 py-1.5 text-right">
          <input_1.Input type="number" min={0} max={100} value={factReadiness} onChange={(e) => onFactChange(Number(e.target.value))} className="h-6 w-16 ml-auto text-[11px] px-1.5 text-right tabular-nums"/>
        </td>
        
        {(() => {
            const diff = factReadiness - group.readinessPlan;
            return (<td className={(0, utils_1.cn)('px-2 py-1.5 text-right tabular-nums font-medium', diff > 0 ? 'text-success' : diff < 0 ? 'text-warning' : 'text-muted-foreground')}>
              {diff > 0 ? '+' : ''}
              {diff}%
            </td>);
        })()}
        
        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
          {group.plannedCostKop > 0 ? formatRubInt(group.plannedCostKop) : '—'}
        </td>
        
        <td className="px-2 py-1.5 text-right tabular-nums">
          {factCostKop > 0 ? formatRubInt(factCostKop) : '—'}
        </td>
        
        <td className="px-2 py-1.5">
          {group.head.isGradable ? (<select_1.Select value={grade === 'none' ? undefined : grade} onValueChange={(v) => onGradeChange(v)}>
              <select_1.SelectTrigger className={(0, utils_1.cn)('h-6 text-[11px] px-2', ungraded && group.totalMinutes > 0 && 'border-warning/50 bg-warning/5')}>
                <select_1.SelectValue placeholder="Не выставлена"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {BUSINESS_GRADE_OPTIONS.map((g) => (<select_1.SelectItem key={g} value={g} className="text-xs">
                    {BUSINESS_GRADE_LABEL[g]} ·{' '}
                    {formatPct(DEFAULT_FINANCE_SETTINGS.businessPercent[g])}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>) : (<span className="text-[10px] text-muted-foreground">—</span>)}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums text-warning">
          {businessSum > 0 ? '+' + formatRubInt(businessSum) : '—'}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
          {net > 0 ? formatRubInt(net) : '—'}
        </td>
      </tr>

      
      {hasChildren &&
            expanded &&
            group.children.map((c) => (<SubRow key={c.idReadable} line={c} parentLabel={group.head.idReadable}/>))}

      
      {!hasChildren && expanded && group.head.contributions.length > 0 && (<ContribRow line={group.head}/>)}

      
      {!hasChildren && (<tr className="hidden">
          <td>
            <button onClick={onToggle}/>
          </td>
        </tr>)}

      
      {!isStory && !hasChildren && ungraded && group.totalMinutes > 0 && (<tr className="border-b border-border">
          <td colSpan={14} className="px-3 py-1 text-[10px] text-warning bg-warning/5">
            Самостоятельная задача без Истории — выставьте оценку бизнеса.
          </td>
        </tr>)}
      {isStory && ungraded && group.totalMinutes > 0 && (<tr className="border-b border-border">
          <td colSpan={14} className="px-3 py-1 text-[10px] text-warning bg-warning/5">
            История без оценки бизнеса — премия не начислена.
          </td>
        </tr>)}
    </react_1.Fragment>);
}
function SubRow({ line, parentLabel }) {
    return (<tr className="border-t border-border/60">
      <td></td>
      <td className="px-2 py-1.5 pl-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-muted-foreground shrink-0">↳ {parentLabel}</span>
          <a href={ytIssueUrl(line.idReadable)} target="_blank" rel="noreferrer" className="font-mono text-foreground hover:text-primary inline-flex items-center gap-1 shrink-0">
            {line.idReadable}
            <lucide_react_1.ExternalLink className="h-3 w-3 opacity-50"/>
          </a>
          <span className="truncate text-muted-foreground">{line.summary}</span>
        </div>
      </td>
      <td className="px-2 py-1.5">
        <IssueTypeBadge type={line.type}/>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        {line.estimateHours || '—'}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums">
        {(line.minutesThisPeriod / 60).toFixed(1).replace('.', ',')}
      </td>
      
      <td colSpan={4} className="px-2 py-1.5 text-[10px] text-muted-foreground text-center">
        <ContribTooltip contributions={line.contributions}/>
      </td>
      
      <td colSpan={2} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        <span className="text-[10px]">входит в Историю</span>
      </td>
      <td colSpan={3}></td>
    </tr>);
}
function ContribRow({ line }) {
    return (<tr className="border-t border-border/60 bg-muted/10">
      <td></td>
      <td colSpan={13} className="px-2 py-1 pl-6">
        <ContribList contributions={line.contributions}/>
      </td>
    </tr>);
}
function ContribTooltip({ contributions }) {
    if (contributions.length === 0) {
        return <span className="text-[10px] text-muted-foreground">—</span>;
    }
    return (<tooltip_1.TooltipProvider delayDuration={150}>
      <tooltip_1.Tooltip>
        <tooltip_1.TooltipTrigger asChild>
          <button className="text-[10px] text-muted-foreground underline decoration-dotted">
            {contributions.length} сотр.
          </button>
        </tooltip_1.TooltipTrigger>
        <tooltip_1.TooltipContent side="top" className="max-w-sm">
          <ContribList contributions={contributions} compact/>
        </tooltip_1.TooltipContent>
      </tooltip_1.Tooltip>
    </tooltip_1.TooltipProvider>);
}
function ContribList({ contributions, compact = false, }) {
    return (<ul className={(0, utils_1.cn)('space-y-0.5', compact ? 'text-[11px]' : 'text-[11px]')}>
      {contributions.map((c, i) => (<li key={i} className="flex items-center gap-2">
          <span className="text-foreground">{c.employeeName}</span>
          <span className="text-muted-foreground">
            · {(c.minutes / 60).toFixed(1).replace('.', ',')} ч
          </span>
          <span className="text-muted-foreground">
            · оц. рук.: {MANAGER_GRADE_LABEL[c.managerGrade]}
          </span>
          {c.baseRateKop > 0 && (<span className="text-muted-foreground">· {formatRubInt(c.baseRateKop)}/ч</span>)}
        </li>))}
    </ul>);
}
const TYPE_TONE = {
    Epic: 'bg-primary/10 text-primary border-primary/30',
    Feature: 'bg-primary/5 text-primary border-primary/20',
    Story: 'bg-success/15 text-success border-success/30',
    Task: 'bg-muted text-muted-foreground border-border',
    Bug: 'bg-destructive/15 text-destructive border-destructive/30',
};
function IssueTypeBadge({ type }) {
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5', TYPE_TONE[type])}>
      {TYPE_LABEL_RU[type]}
    </badge_1.Badge>);
}
function KpiCard({ icon: Icon, label, value, sub, tone = 'neutral', }) {
    const toneCls = {
        neutral: 'text-foreground',
        primary: 'text-primary',
        success: 'text-success',
        warn: 'text-warning',
        danger: 'text-destructive',
    }[tone];
    return (<div className="bg-card border border-border rounded-md shadow-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3"/>
        {label}
      </div>
      <div className={(0, utils_1.cn)('text-lg font-semibold tabular-nums leading-tight mt-0.5', toneCls)}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>);
}
//# sourceMappingURL=Finance.js.map