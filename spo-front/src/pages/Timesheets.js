"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const PageHeader_1 = require("@/components/layout/PageHeader");
const KpiCard_1 = require("@/components/dashboard/KpiCard");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const textarea_1 = require("@/components/ui/textarea");
const select_1 = require("@/components/ui/select");
const tabs_1 = require("@/components/ui/tabs");
const table_1 = require("@/components/ui/table");
const dialog_1 = require("@/components/ui/dialog");
const label_1 = require("@/components/ui/label");
const tooltip_1 = require("@/components/ui/tooltip");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const planning_1 = require("@/lib/planning");
const finance_1 = require("@/lib/finance");
const useTimesheets_1 = require("@/hooks/useTimesheets");
const VIEWER_OPTIONS = [
    { id: 'e-dev-2', label: 'Орлова Т. М. (Сотрудник)' },
    { id: 'e-pm-2', label: 'Лебедева О. А. (Руководитель / PM)' },
    { id: 'e-pm-3', label: 'Беляев С. В. (Руководитель / PM)' },
    { id: 'e-pm-1', label: 'Морозов И. К. (Директор)' },
];
const DIRECTOR_ID = 'director';
function dtoToTimesheet(dto) {
    return {
        id: dto.id,
        employeeId: dto.employeeId,
        year: dto.year,
        month: dto.month,
        status: dto.status,
        rows: dto.rows.map((r) => ({
            id: r.id,
            issueIdReadable: r.issueIdReadable,
            source: r.source,
            minutes: r.minutes,
            comment: r.comment ?? undefined,
            managerGrade: r.managerGrade,
            businessGrade: r.businessGrade,
        })),
        rowChanges: dto.rowChanges.map((rc) => ({
            at: rc.createdAt,
            actorId: rc.actorId,
            rowId: rc.rowId,
            field: rc.field,
            fromValue: rc.fromValue,
            toValue: rc.toValue,
        })),
        history: dto.history.map((h) => ({
            at: h.createdAt,
            actorId: h.actorId,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            comment: h.comment ?? undefined,
        })),
    };
}
function issueShort(idReadable, backlogItems) {
    return backlogItems.find((b) => b.idReadable === idReadable) ?? null;
}
const STATUS_BADGE = {
    draft: { className: 'bg-muted text-muted-foreground border-border', icon: lucide_react_1.ClipboardList },
    submitted: { className: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: lucide_react_1.Send },
    manager_approved: {
        className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
        icon: lucide_react_1.ShieldCheck,
    },
    approved: {
        className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
        icon: lucide_react_1.CheckCircle2,
    },
    rejected: { className: 'bg-rose-500/15 text-rose-700 border-rose-500/30', icon: lucide_react_1.XCircle },
};
const STANDARD_MONTH_HOURS = 168;
function StatusBadge({ status }) {
    const { className, icon: Icon } = STATUS_BADGE[status];
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('gap-1 font-normal', className)}>
      <Icon className="h-3 w-3"/>
      {TIMESHEET_STATUS_LABEL_RU[status]}
    </badge_1.Badge>);
}
const PRIORITY_BADGE = {
    Blocker: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
    High: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
    Medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    Low: 'bg-muted text-muted-foreground border-border',
};
function aggregateBlock(rows, activeSalary) {
    let minutes = 0;
    let baseSum = 0;
    let mgrSum = 0;
    let bizSum = 0;
    for (const r of rows) {
        const f = (0, finance_1.computeRowFinance)(r.minutes, activeSalary, r.managerGrade, r.businessGrade, finance_1.DEFAULT_FINANCE_SETTINGS);
        minutes += r.minutes;
        baseSum += f.baseSumKop;
        mgrSum += f.managerSumKop;
        bizSum += f.businessSumKop;
    }
    const baseRate = activeSalary ? (0, finance_1.baseHourlyRateKop)(activeSalary) : 0;
    const baseGrossKop = Math.round((minutes / 60) * baseRate);
    const mgrPct = baseGrossKop > 0 ? mgrSum / baseGrossKop : 0;
    const bizPct = baseGrossKop > 0 ? bizSum / baseGrossKop : 0;
    const netTotal = baseSum + mgrSum + bizSum;
    const effRate = minutes > 0 ? Math.round(netTotal / (minutes / 60)) : 0;
    return { minutes, baseSum, mgrSum, bizSum, mgrPct, bizPct, netTotal, effRate };
}
function HoursCell({ minutes, canEdit, onCommit, }) {
    const initial = (0, finance_1.minutesToHoursStr)(minutes);
    const [draft, setDraft] = (0, react_1.useState)(initial);
    const lastInitialRef = (0, react_1.useRef)(initial);
    if (lastInitialRef.current !== initial) {
        lastInitialRef.current = initial;
        if (draft !== initial)
            setDraft(initial);
    }
    const dirty = draft.trim() !== initial;
    if (!canEdit) {
        return <span className="font-mono text-xs num-tabular">{initial} ч</span>;
    }
    const commit = () => {
        const newMin = parseHoursToMinutes(draft);
        if (newMin === minutes) {
            setDraft((0, finance_1.minutesToHoursStr)(minutes));
            return;
        }
        onCommit(newMin, `${(0, finance_1.minutesToHoursStr)(minutes)} ч`, `${(0, finance_1.minutesToHoursStr)(newMin)} ч`);
    };
    const cancel = () => setDraft(initial);
    return (<div className="flex items-center justify-end gap-1">
      <input_1.Input className="h-7 text-right w-[64px] num-tabular text-xs px-1.5" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter')
                commit();
            if (e.key === 'Escape')
                cancel();
        }}/>
      {dirty && (<>
          <button_1.Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10" title="Сохранить и записать в историю" onMouseDown={(e) => {
                e.preventDefault();
                commit();
            }}>
            <lucide_react_1.Check className="h-3.5 w-3.5"/>
          </button_1.Button>
          <button_1.Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" title="Отменить изменение" onMouseDown={(e) => {
                e.preventDefault();
                cancel();
            }}>
            <lucide_react_1.X className="h-3.5 w-3.5"/>
          </button_1.Button>
        </>)}
    </div>);
}
function GradeCell({ value, options, canEdit, onChange, }) {
    if (!canEdit) {
        return (<span className={(0, utils_1.cn)('text-[11px]', value === 'none' ? 'text-muted-foreground italic' : '')}>
        {options[value]}
      </span>);
    }
    return (<select_1.Select value={value} onValueChange={(v) => {
            if (v === value)
                return;
            onChange(v, options[value], options[v]);
        }}>
      <select_1.SelectTrigger className="h-7 text-[11px] px-2">
        <select_1.SelectValue />
      </select_1.SelectTrigger>
      <select_1.SelectContent>
        {Object.keys(options).map((k) => (<select_1.SelectItem key={k} value={k} className="text-xs">
            {options[k]}
          </select_1.SelectItem>))}
      </select_1.SelectContent>
    </select_1.Select>);
}
const Timesheets = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const tsApi = (0, useTimesheets_1.useTimesheets)();
    const [viewerId, setViewerId] = (0, react_1.useState)('e-dev-2');
    const [year, setYear] = (0, react_1.useState)(new Date().getFullYear());
    const [month, setMonth] = (0, react_1.useState)(new Date().getMonth() + 1);
    const [activeTab, setActiveTab] = (0, react_1.useState)('my');
    const [rejectDialog, setRejectDialog] = (0, react_1.useState)(null);
    const [rejectComment, setRejectComment] = (0, react_1.useState)('');
    const [addRowDialog, setAddRowDialog] = (0, react_1.useState)(null);
    const [addIssueId, setAddIssueId] = (0, react_1.useState)('');
    const [historyDialog, setHistoryDialog] = (0, react_1.useState)(null);
    const { data: periodsData } = tsApi.usePeriods(1, 100);
    const periods = periodsData?.data ?? [];
    const { data: backlogData } = tsApi.useBacklog({ page: 1, limit: 200 });
    const backlogItems = backlogData?.data ?? [];
    const { data: dictionariesData } = tsApi.useDictionaries();
    const projects = dictionariesData?.projects ?? [];
    const systems = dictionariesData?.systems ?? [];
    const { data: myTimesheetDto } = tsApi.useMyTimesheet(year, month);
    const myTimesheet = (0, react_1.useMemo)(() => (myTimesheetDto ? dtoToTimesheet(myTimesheetDto) : null), [myTimesheetDto]);
    const [subordinateIds, setSubordinateIds] = (0, react_1.useState)([]);
    const { data: teamTimesheetsDto } = tsApi.useTeamTimesheets(year, month, subordinateIds);
    const teamTimesheets = (0, react_1.useMemo)(() => (teamTimesheetsDto ?? []).map(dtoToTimesheet), [teamTimesheetsDto]);
    const timesheets = (0, react_1.useMemo)(() => {
        const arr = [];
        if (myTimesheet)
            arr.push(myTimesheet);
        for (const t of teamTimesheets) {
            if (!arr.find((x) => x.id === t.id))
                arr.push(t);
        }
        return arr;
    }, [myTimesheet, teamTimesheets]);
    const employeesInTimesheets = (0, react_1.useMemo)(() => {
        const seen = new Set();
        const result = [];
        const addEmp = (empId) => {
            if (seen.has(empId))
                return;
            seen.add(empId);
            const isMgr = teamTimesheetsDto?.some((t) => t.employeeId !== empId && subordinateIds.includes(t.employeeId));
            result.push({
                id: empId,
                name: empId,
                position: '',
                workRole: '',
                monthlyNetSalary: 0,
                ytLogin: '',
                managerId: null,
                isDirector: empId === 'e-pm-1',
            });
        };
        addEmp(viewerId);
        for (const t of teamTimesheets) {
            addEmp(t.employeeId);
        }
        return result;
    }, [viewerId, teamTimesheets, teamTimesheetsDto, subordinateIds]);
    const viewerIsDirector = viewerId === DIRECTOR_ID;
    const isDirector = viewerIsDirector;
    const subordinates = (0, react_1.useMemo)(() => employeesInTimesheets.filter((e) => e.id !== viewerId), [employeesInTimesheets, viewerId]);
    const isManager = subordinates.length > 0;
    const teamStats = (0, react_1.useMemo)(() => {
        const byStatus = {
            draft: 0,
            submitted: 0,
            manager_approved: 0,
            approved: 0,
            rejected: 0,
        };
        let totalH = 0;
        for (const t of teamTimesheets) {
            byStatus[t.status]++;
            totalH += (0, finance_1.totalHours)(t);
        }
        const pending = byStatus.submitted + (isDirector ? byStatus.manager_approved : 0);
        return { byStatus, totalH, pending, count: teamTimesheets.length };
    }, [teamTimesheets, isDirector]);
    (0, react_1.useEffect)(() => {
        const allIds = [];
        if (viewerId === DIRECTOR_ID) {
            allIds.push('e-dev-1', 'e-dev-2', 'e-dev-3', 'e-dev-4', 'e-dev-5', 'e-dev-6', 'e-dev-7', 'e-dev-8', 'e-dev-9', 'e-dev-10', 'e-dev-11', 'e-dev-12', 'e-qa-1', 'e-qa-2', 'e-qa-3', 'e-pm-2', 'e-pm-3');
        }
        else if (viewerId === 'e-pm-2') {
            allIds.push('e-dev-1', 'e-dev-2', 'e-dev-3', 'e-dev-4', 'e-dev-5', 'e-dev-6');
        }
        else if (viewerId === 'e-pm-3') {
            allIds.push('e-dev-7', 'e-dev-8', 'e-dev-9', 'e-dev-10', 'e-dev-11', 'e-dev-12', 'e-qa-1', 'e-qa-2', 'e-qa-3');
        }
        setSubordinateIds(allIds);
    }, [viewerId]);
    const updateRowMutation = tsApi.useUpdateRow();
    const addRowMutation = tsApi.useAddRow();
    const deleteRowMutation = tsApi.useDeleteRow();
    const submitMutation = tsApi.useSubmit();
    const recallMutation = tsApi.useRecall();
    const managerApproveMutation = tsApi.useManagerApprove();
    const directorApproveMutation = tsApi.useDirectorApprove();
    const rejectMutation = tsApi.useReject();
    const upsertTs = (next) => {
        toast({
            title: 'Табель обновлён',
            description: 'Изменения сохранены.',
        });
    };
    const transition = (ts, toStatus, actorId, comment) => ({
        ...ts,
        status: toStatus,
        history: [
            ...ts.history,
            {
                at: new Date().toISOString(),
                actorId,
                fromStatus: ts.status,
                toStatus,
                comment,
            },
        ],
    });
    const updateRow = (ts, rowId, patch, audit) => {
        const change = audit
            ? {
                at: new Date().toISOString(),
                actorId: viewerId,
                rowId,
                field: audit.field,
                fromValue: audit.from,
                toValue: audit.to,
            }
            : null;
        upsertTs({
            ...ts,
            rows: ts.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
            rowChanges: change ? [...(ts.rowChanges ?? []), change] : (ts.rowChanges ?? []),
        });
    };
    const removeRow = (ts, rowId) => {
        upsertTs({ ...ts, rows: ts.rows.filter((r) => r.id !== rowId) });
    };
    const addRow = (ts, issueIdReadable) => {
        if (ts.rows.some((r) => r.issueIdReadable === issueIdReadable)) {
            toast({
                title: 'Задача уже есть в табеле',
                description: issueIdReadable,
                variant: 'destructive',
            });
            return;
        }
        upsertTs({
            ...ts,
            rows: [
                ...ts.rows,
                {
                    id: `${ts.id}-row-${Date.now()}`,
                    issueIdReadable,
                    source: 'worklog',
                    minutes: 0,
                    managerGrade: 'none',
                    businessGrade: 'none',
                },
            ],
        });
    };
    const submit = (ts) => {
        upsertTs(transition(ts, 'submitted', viewerId));
        toast({ title: 'Табель отправлен на согласование' });
    };
    const recall = (ts) => {
        upsertTs(transition(ts, 'draft', viewerId, 'Отозван автором'));
        toast({ title: 'Табель возвращён в черновик' });
    };
    const managerApprove = (ts) => {
        upsertTs(transition(ts, 'manager_approved', viewerId));
        toast({ title: 'Согласовано руководителем' });
    };
    const directorApprove = (ts) => {
        upsertTs(transition(ts, 'approved', viewerId));
        toast({ title: 'Утверждено директором — табель заблокирован' });
    };
    const reject = (ts, comment) => {
        upsertTs(transition(ts, 'rejected', viewerId, comment));
        toast({ title: 'Табель отклонён', description: 'Сотрудник получит уведомление' });
    };
    const [sortState, setSortState] = (0, react_1.useState)({});
    const cycleSort = (storeKey, key) => {
        setSortState((prev) => {
            const cur = prev[storeKey];
            let next;
            if (!cur || cur.key !== key)
                next = { key, dir: 'asc' };
            else if (cur.dir === 'asc')
                next = { key, dir: 'desc' };
            else
                next = null;
            return { ...prev, [storeKey]: next };
        });
    };
    const renderRowsTable = (ts, viewerRole) => {
        const flags = actionsFor(viewerRole, ts.status);
        const total = ts.rows.reduce((s, r) => s + r.minutes, 0);
        const totalH = total / 60;
        const overflow = totalH > STANDARD_MONTH_HOURS + 24;
        const planRows = ts.rows.filter((r) => r.source === 'plan');
        const offRows = ts.rows.filter((r) => r.source === 'worklog');
        const activeSalary = (0, finance_1.activeSalaryFor)(finance_1.initialSalaryHistory, ts.employeeId, ts.year, ts.month);
        const canEditManagerGrade = flags.canEdit && (viewerRole === 'manager' || viewerRole === 'director');
        const canEditBusinessGrade = flags.canEdit && viewerRole === 'director';
        const sortValue = (row, key) => {
            const issue = issueShort(row.issueIdReadable, backlogItems);
            const proj = issue ? projects.find((p) => p.id === issue.projectId) : undefined;
            const sys = issue ? systems.find((s) => s.id === issue.systemId) : undefined;
            const fin = (0, finance_1.computeRowFinance)(row.minutes, activeSalary, row.managerGrade, row.businessGrade, finance_1.DEFAULT_FINANCE_SETTINGS);
            const priorityRank = {
                Blocker: 0,
                High: 1,
                Medium: 2,
                Low: 3,
            };
            switch (key) {
                case 'project':
                    return proj?.shortName ?? '';
                case 'system':
                    return sys?.name ?? '';
                case 'type':
                    return issue ? TYPE_LABEL_RU[issue.type] : '';
                case 'priority':
                    return issue ? priorityRank[issue.priority] : 99;
                case 'id':
                    return row.issueIdReadable;
                case 'summary':
                    return issue?.summary ?? '';
                case 'state':
                    return issue ? STATE_LABEL_RU[issue.state] : '';
                case 'planHours':
                    return issue?.estimateHours ?? 0;
                case 'readiness':
                    return issue?.readiness ?? 0;
                case 'hours':
                    return row.minutes;
                case 'baseSum':
                    return fin.baseSumKop;
                case 'mgrPct':
                    return row.managerGrade === 'none'
                        ? -1
                        : fin.managerSumKop / Math.max(fin.baseSumKop || 1, 1);
                case 'mgrSum':
                    return fin.managerSumKop;
                case 'bizPct':
                    return row.businessGrade === 'none'
                        ? -1
                        : fin.businessSumKop / Math.max(fin.baseSumKop || 1, 1);
                case 'bizSum':
                    return fin.businessSumKop;
                case 'netTotal':
                    return fin.netTotalKop;
                case 'effRate':
                    return row.minutes > 0 ? fin.effectiveRateKop : -1;
            }
        };
        const applySort = (rows, storeKey) => {
            const s = sortState[storeKey];
            if (!s)
                return rows;
            const sorted = [...rows].sort((a, b) => {
                const va = sortValue(a, s.key);
                const vb = sortValue(b, s.key);
                if (typeof va === 'number' && typeof vb === 'number')
                    return va - vb;
                return String(va).localeCompare(String(vb), 'ru');
            });
            if (s.dir === 'desc')
                sorted.reverse();
            return sorted;
        };
        const renderRow = (row) => {
            const issue = issueShort(row.issueIdReadable, backlogItems);
            const proj = issue ? projects.find((p) => p.id === issue.projectId) : undefined;
            const sys = issue ? systems.find((s) => s.id === issue.systemId) : undefined;
            const fin = (0, finance_1.computeRowFinance)(row.minutes, activeSalary, row.managerGrade, row.businessGrade, finance_1.DEFAULT_FINANCE_SETTINGS);
            return (<table_1.TableRow key={row.id} className="h-9 [&>td]:py-1 [&>td]:px-3">
          <table_1.TableCell className="text-xs">{proj?.shortName ?? '—'}</table_1.TableCell>
          <table_1.TableCell className="text-xs text-muted-foreground">{sys?.name ?? '—'}</table_1.TableCell>
          <table_1.TableCell className="text-xs">{issue ? TYPE_LABEL_RU[issue.type] : '—'}</table_1.TableCell>
          <table_1.TableCell>
            {issue && (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[9px] px-1.5 py-0 leading-4', PRIORITY_BADGE[issue.priority])}>
                {PRIORITY_LABEL_RU[issue.priority]}
              </badge_1.Badge>)}
          </table_1.TableCell>
          <table_1.TableCell className="font-mono text-xs">
            <a href={ytIssueUrl(row.issueIdReadable)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {row.issueIdReadable}
            </a>
          </table_1.TableCell>
          <table_1.TableCell className="text-sm min-w-[220px]">
            <div className="line-clamp-2">{issue?.summary ?? '—'}</div>
          </table_1.TableCell>
          <table_1.TableCell className="text-xs text-muted-foreground">
            {issue ? STATE_LABEL_RU[issue.state] : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular">
            {issue ? `${issue.estimateHours} ч` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular">
            {issue ? `${issue.readiness}%` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right">
            <HoursCell minutes={row.minutes} canEdit={flags.canEdit} onCommit={(newMin, fromLabel, toLabel) => {
                    updateRow(ts, row.id, { minutes: newMin }, { field: 'minutes', from: fromLabel, to: toLabel });
                    toast({
                        title: 'Часы сохранены',
                        description: `${row.issueIdReadable}: ${fromLabel} → ${toLabel}`,
                    });
                }}/>
          </table_1.TableCell>
          
          <table_1.TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {(0, finance_1.formatRubInt)(fin.baseSumKop)}
          </table_1.TableCell>
          <table_1.TableCell className="bg-muted/20">
            <GradeCell value={row.managerGrade} options={finance_1.MANAGER_GRADE_LABEL} canEdit={canEditManagerGrade} onChange={(v, fromLabel, toLabel) => updateRow(ts, row.id, { managerGrade: v }, { field: 'managerGrade', from: fromLabel, to: toLabel })}/>
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {(0, finance_1.formatRubInt)(fin.managerSumKop)}
          </table_1.TableCell>
          <table_1.TableCell className="bg-muted/20">
            <GradeCell value={row.businessGrade} options={finance_1.BUSINESS_GRADE_LABEL} canEdit={canEditBusinessGrade} onChange={(v, fromLabel, toLabel) => updateRow(ts, row.id, { businessGrade: v }, { field: 'businessGrade', from: fromLabel, to: toLabel })}/>
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {(0, finance_1.formatRubInt)(fin.businessSumKop)}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular font-medium bg-muted/30">
            {(0, finance_1.formatRubInt)(fin.netTotalKop)}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-[11px] num-tabular text-muted-foreground bg-muted/20">
            {row.minutes > 0 ? `${(0, finance_1.formatRubInt)(fin.effectiveRateKop)}/ч` : '—'}
          </table_1.TableCell>
          <table_1.TableCell>
            {flags.canEdit && row.source === 'worklog' && (<button_1.Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(ts, row.id)} title="Удалить строку">
                <lucide_react_1.Trash2 className="h-3.5 w-3.5"/>
              </button_1.Button>)}
          </table_1.TableCell>
        </table_1.TableRow>);
        };
        const SortHead = ({ label, sortKey, storeKey, align = 'left', className, title, }) => {
            const s = sortState[storeKey];
            const active = s?.key === sortKey;
            const Icon = !active ? lucide_react_1.ArrowUpDown : s.dir === 'asc' ? lucide_react_1.ArrowUp : lucide_react_1.ArrowDown;
            return (<table_1.TableHead className={className} title={title}>
          <button type="button" onClick={() => cycleSort(storeKey, sortKey)} className={(0, utils_1.cn)('inline-flex items-center gap-1 select-none hover:text-foreground transition-colors w-full', align === 'right' ? 'justify-end' : 'justify-start', active ? 'text-foreground' : 'text-muted-foreground')}>
            <span>{label}</span>
            <Icon className={(0, utils_1.cn)('h-3 w-3 shrink-0', active ? 'opacity-100' : 'opacity-30')}/>
          </button>
        </table_1.TableHead>);
        };
        const headerRow = (storeKey) => (<table_1.TableRow className="bg-muted/40 h-9 [&>th]:h-9 [&>th]:py-1 [&>th]:px-3">
        <SortHead label="Проект" sortKey="project" storeKey={storeKey} className="w-[60px]"/>
        <SortHead label="Система" sortKey="system" storeKey={storeKey} className="w-[90px]"/>
        <SortHead label="Тип" sortKey="type" storeKey={storeKey} className="w-[60px]"/>
        <SortHead label="Приор." sortKey="priority" storeKey={storeKey} className="w-[80px]"/>
        <SortHead label="ID" sortKey="id" storeKey={storeKey} className="w-[90px]"/>
        <SortHead label="Название задачи" sortKey="summary" storeKey={storeKey} className="min-w-[220px]"/>
        <SortHead label="Статус" sortKey="state" storeKey={storeKey} className="w-[100px]"/>
        <SortHead label="Часы плана" sortKey="planHours" storeKey={storeKey} align="right" className="w-[80px] text-right"/>
        <SortHead label="Готов." sortKey="readiness" storeKey={storeKey} align="right" className="w-[80px] text-right"/>
        <SortHead label="Часы" sortKey="hours" storeKey={storeKey} align="right" className="w-[140px] text-right"/>
        
        <SortHead label="Сум. базовая" sortKey="baseSum" storeKey={storeKey} align="right" className="w-[100px] text-right bg-muted/20" title="Часы × ставка × базовый %"/>
        <SortHead label="% от руководителя" sortKey="mgrPct" storeKey={storeKey} className="w-[140px] bg-muted/20"/>
        <SortHead label="Сум. рук." sortKey="mgrSum" storeKey={storeKey} align="right" className="w-[100px] text-right bg-muted/20"/>
        <SortHead label="% от бизнеса" sortKey="bizPct" storeKey={storeKey} className="w-[140px] bg-muted/20"/>
        <SortHead label="Сум. бизн." sortKey="bizSum" storeKey={storeKey} align="right" className="w-[100px] text-right bg-muted/20"/>
        <SortHead label="Итого на руки" sortKey="netTotal" storeKey={storeKey} align="right" className="w-[110px] text-right bg-muted/30"/>
        <SortHead label="Эфф. ставка" sortKey="effRate" storeKey={storeKey} align="right" className="w-[100px] text-right bg-muted/20" title="Итого на руки / часы"/>
        <table_1.TableHead className="w-[44px]"></table_1.TableHead>
      </table_1.TableRow>);
        const renderTotalsRow = (rows) => {
            const agg = aggregateBlock(rows, activeSalary);
            const planHoursSum = rows.reduce((s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.estimateHours ?? 0), 0);
            const readinessNum = rows.reduce((s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.readiness ?? 0) * r.minutes, 0);
            const readinessAvg = agg.minutes > 0 ? Math.round(readinessNum / agg.minutes) : 0;
            const rowToneClass = 'h-9 bg-accent/10 hover:bg-accent/10 font-medium border-y border-border/60';
            return (<table_1.TableRow className={rowToneClass}>
          <table_1.TableCell colSpan={7} className="py-1 px-3 text-xs uppercase tracking-wide text-muted-foreground">
            Итого · {rows.length} зад.
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {planHoursSum} ч
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {rows.length > 0 ? `${readinessAvg}%` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {(0, finance_1.minutesToHoursStr)(agg.minutes)} ч
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {(0, finance_1.formatRubInt)(agg.baseSum)}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-[11px] num-tabular bg-accent/15 text-muted-foreground">
            ср. {Math.round(agg.mgrPct * 100)}%
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {(0, finance_1.formatRubInt)(agg.mgrSum)}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-[11px] num-tabular bg-accent/15 text-muted-foreground">
            ср. {Math.round(agg.bizPct * 100)}%
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {(0, finance_1.formatRubInt)(agg.bizSum)}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-xs num-tabular font-semibold bg-accent/20">
            {(0, finance_1.formatRubInt)(agg.netTotal)}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {agg.minutes > 0 ? `${(0, finance_1.formatRubInt)(agg.effRate)}/ч` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="py-1 px-3"/>
        </table_1.TableRow>);
        };
        const renderBlock = (title, subtitle, rows, tone, emptyHint, blockKey) => {
            const storeKey = `${ts.id}:${blockKey}`;
            const sortedRows = applySort(rows, storeKey);
            return (<div className={(0, utils_1.cn)('rounded-md border overflow-hidden', tone === 'plan' ? 'border-primary/30' : 'border-amber-500/30')}>
          <div className={(0, utils_1.cn)('flex items-center justify-between px-3 py-2 border-b text-sm', tone === 'plan'
                    ? 'bg-primary/5 border-primary/20 text-primary'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-800')}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{title}</span>
              <span className="text-xs opacity-70">· {subtitle}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table_1.Table>
              <table_1.TableHeader>{headerRow(storeKey)}</table_1.TableHeader>
              <table_1.TableBody>
                {rows.length === 0 ? (<table_1.TableRow>
                    <table_1.TableCell colSpan={18} className="text-center text-muted-foreground text-xs py-4">
                      {emptyHint}
                    </table_1.TableCell>
                  </table_1.TableRow>) : (<>
                    {renderTotalsRow(rows)}
                    {sortedRows.map(renderRow)}
                  </>)}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </div>);
        };
        const baseRate = activeSalary ? (0, finance_1.baseHourlyRateKop)(activeSalary) : 0;
        return (<div className="space-y-3">
        
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 rounded-md border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Базовая ставка:{' '}
            <span className="font-medium text-foreground num-tabular">
              {activeSalary ? `${(0, finance_1.formatRubInt)(baseRate)}/ч` : 'ставка не задана'}
            </span>
          </span>
          {activeSalary && (<>
              <span className="text-muted-foreground">
                ЗП на руки/мес:{' '}
                <span className="font-medium text-foreground num-tabular">
                  {(0, finance_1.formatRubInt)(activeSalary.monthlyNetKop)}
                </span>
              </span>
              <span className="text-muted-foreground">
                Раб. часов в году:{' '}
                <span className="font-medium text-foreground num-tabular">
                  {activeSalary.workHoursPerYear}
                </span>
              </span>
              <span className="text-muted-foreground">
                Действует с:{' '}
                <span className="font-medium text-foreground">{activeSalary.effectiveFrom}</span>
              </span>
            </>)}
          <span className="text-muted-foreground">
            Базовый %:{' '}
            <span className="font-medium text-foreground">
              {Math.round(finance_1.DEFAULT_FINANCE_SETTINGS.basePercent * 100)}%
            </span>
          </span>
          <span className={(0, utils_1.cn)('ml-auto', overflow ? 'text-amber-700 font-medium' : 'text-muted-foreground')}>
            Норма / итого, ч:{' '}
            <span className="font-medium num-tabular">
              {STANDARD_MONTH_HOURS} / {(0, finance_1.minutesToHoursStr)(total)}
            </span>
            {overflow && <lucide_react_1.AlertCircle className="inline h-3 w-3 ml-1 text-amber-700"/>}
          </span>
        </div>

        {renderBlock('План месяца', 'задачи, назначенные в Планировании', planRows, 'plan', 'В плане месяца нет задач для этого сотрудника.', 'plan')}
        {renderBlock('Вне плана', 'задачи из YouTrack, в которые списывались часы', offRows, 'off', 'Внеплановых задач нет.', 'off')}
        
        {(() => {
                const allRows = [...planRows, ...offRows];
                if (allRows.length === 0)
                    return null;
                const agg = aggregateBlock(allRows, activeSalary);
                const planHoursSum = allRows.reduce((s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.estimateHours ?? 0), 0);
                return (<div className="rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                <span className="text-[11px] uppercase tracking-wide font-semibold text-primary">
                  Итого по табелю · {allRows.length} зад.
                </span>
                <span className="text-muted-foreground">
                  План часов:{' '}
                  <span className="font-medium text-foreground num-tabular">{planHoursSum} ч</span>
                </span>
                <span className="text-muted-foreground">
                  Часы:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {(0, finance_1.minutesToHoursStr)(agg.minutes)} ч
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Сум. базовая:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {(0, finance_1.formatRubInt)(agg.baseSum)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  ср. % рук.:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {Math.round(agg.mgrPct * 100)}%
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Сум. рук.:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {(0, finance_1.formatRubInt)(agg.mgrSum)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  ср. % бизн.:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {Math.round(agg.bizPct * 100)}%
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Сум. бизн.:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {(0, finance_1.formatRubInt)(agg.bizSum)}
                  </span>
                </span>
                <span className="ml-auto flex items-center gap-x-4 gap-y-1 flex-wrap">
                  <span className="text-muted-foreground">
                    Эфф. ставка:{' '}
                    <span className="font-medium text-foreground num-tabular">
                      {agg.minutes > 0 ? `${(0, finance_1.formatRubInt)(agg.effRate)}/ч` : '—'}
                    </span>
                  </span>
                  <span className="text-primary font-semibold">
                    Итого на руки: <span className="num-tabular">{(0, finance_1.formatRubInt)(agg.netTotal)}</span>
                  </span>
                </span>
              </div>
            </div>);
            })()}
      </div>);
    };
    const renderActions = (ts, viewerRole) => {
        const flags = actionsFor(viewerRole, ts.status);
        return (<div className="flex flex-wrap items-center gap-2">
        {flags.canEdit && (<button_1.Button size="sm" variant="outline" onClick={() => setAddRowDialog({ tsId: ts.id })}>
            <lucide_react_1.Plus className="h-3.5 w-3.5 mr-1"/> Добавить задачу
          </button_1.Button>)}
        {flags.canSubmit && (<button_1.Button size="sm" onClick={() => submit(ts)}>
            <lucide_react_1.Send className="h-3.5 w-3.5 mr-1"/> Отправить на согласование
          </button_1.Button>)}
        {flags.canRecall && (<button_1.Button size="sm" variant="outline" onClick={() => recall(ts)}>
            <lucide_react_1.RotateCcw className="h-3.5 w-3.5 mr-1"/> Отозвать
          </button_1.Button>)}
        {flags.canManagerApprove && (<button_1.Button size="sm" onClick={() => managerApprove(ts)}>
            <lucide_react_1.ShieldCheck className="h-3.5 w-3.5 mr-1"/> Согласовать
          </button_1.Button>)}
        {flags.canDirectorApprove && (<button_1.Button size="sm" onClick={() => directorApprove(ts)}>
            <lucide_react_1.CheckCircle2 className="h-3.5 w-3.5 mr-1"/> Утвердить
          </button_1.Button>)}
        {flags.canReject && (<button_1.Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => {
                    setRejectComment('');
                    setRejectDialog({ tsId: ts.id });
                }}>
            <lucide_react_1.XCircle className="h-3.5 w-3.5 mr-1"/> Отклонить
          </button_1.Button>)}
        <button_1.Button size="sm" variant="ghost" onClick={() => setHistoryDialog({ tsId: ts.id })}>
          История
        </button_1.Button>
        {ts.status === 'approved' && (<badge_1.Badge variant="outline" className="gap-1">
            <lucide_react_1.Lock className="h-3 w-3"/> Заблокирован
          </badge_1.Badge>)}
      </div>);
    };
    const renderMy = () => {
        if (!myTimesheet) {
            return (<div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md">
          Табель за выбранный период не найден.
        </div>);
        }
        const ts = myTimesheet;
        return (<div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <lucide_react_1.UserCircle2 className="h-5 w-5 text-muted-foreground"/>
            <div>
              <div className="font-medium">{viewerId}</div>
              <div className="text-xs text-muted-foreground">Сотрудник</div>
            </div>
            <StatusBadge status={ts.status}/>
          </div>
          {renderActions(ts, 'self')}
        </div>
        {ts.status === 'rejected' && (<div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-800 flex items-start gap-2">
            <lucide_react_1.XCircle className="h-4 w-4 mt-0.5 shrink-0"/>
            <div>
              <div className="font-medium">Табель отклонён руководителем</div>
              <div className="text-xs">
                {ts.history.filter((h) => h.toStatus === 'rejected').slice(-1)[0]?.comment ??
                    'Без комментария'}
              </div>
            </div>
          </div>)}
        {renderRowsTable(ts, 'self')}
      </div>);
    };
    const [teamStatusFilter, setTeamStatusFilter] = (0, react_1.useState)('pending');
    const [expandedTs, setExpandedTs] = (0, react_1.useState)({});
    const renderTeam = () => {
        if (!isManager) {
            return (<div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md">
          У вас нет подчинённых сотрудников.
        </div>);
        }
        const directorViewer = isDirector;
        const filtered = teamTimesheets.filter((ts) => {
            if (teamStatusFilter === 'all')
                return true;
            if (teamStatusFilter === 'pending') {
                return ts.status === 'submitted' || (directorViewer && ts.status === 'manager_approved');
            }
            return ts.status === teamStatusFilter;
        });
        const filterOptions = [
            {
                value: 'pending',
                label: 'Требуют действия',
                count: teamStats.byStatus.submitted + (directorViewer ? teamStats.byStatus.manager_approved : 0),
            },
            { value: 'all', label: 'Все', count: teamStats.count },
            { value: 'draft', label: 'Черновики', count: teamStats.byStatus.draft },
            { value: 'submitted', label: 'На согл. рук.', count: teamStats.byStatus.submitted },
            {
                value: 'manager_approved',
                label: 'На утв. дир.',
                count: teamStats.byStatus.manager_approved,
            },
            { value: 'approved', label: 'Утверждены', count: teamStats.byStatus.approved },
            { value: 'rejected', label: 'Отклонены', count: teamStats.byStatus.rejected },
        ];
        const toggleExpand = (id) => setExpandedTs((prev) => ({ ...prev, [id]: !prev[id] }));
        return (<div className="space-y-4">
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard_1.KpiCard label="Сотрудников в команде" value={String(teamStats.count)} icon={lucide_react_1.Users}/>
          <KpiCard_1.KpiCard label="Ожидают вашего согласования" value={String(teamStats.pending)} icon={lucide_react_1.Send} accent={teamStats.pending > 0 ? 'warning' : 'primary'}/>
          <KpiCard_1.KpiCard label="Утверждено" value={String(teamStats.byStatus.approved)} icon={lucide_react_1.CheckCircle2} accent="success"/>
          <KpiCard_1.KpiCard label="Часов всего" value={`${teamStats.totalH.toFixed(0)} ч`} icon={lucide_react_1.ClipboardList}/>
        </div>

        
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((o) => (<button key={o.value} type="button" onClick={() => setTeamStatusFilter(o.value)} className={(0, utils_1.cn)('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors', teamStatusFilter === o.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted')}>
              {o.label}
              <span className={(0, utils_1.cn)('inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium', teamStatusFilter === o.value
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground')}>
                {o.count}
              </span>
            </button>))}
        </div>

        
        <div className="rounded-md border border-border overflow-hidden">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow className="bg-muted/40">
                <table_1.TableHead className="w-[36px]"></table_1.TableHead>
                <table_1.TableHead>Сотрудник</table_1.TableHead>
                <table_1.TableHead>Должность</table_1.TableHead>
                <table_1.TableHead>Статус</table_1.TableHead>
                <table_1.TableHead className="text-right">Строк</table_1.TableHead>
                <table_1.TableHead className="text-right">Часы</table_1.TableHead>
                <table_1.TableHead className="text-right">К норме</table_1.TableHead>
                <table_1.TableHead className="text-right">На руки</table_1.TableHead>
                <table_1.TableHead className="text-right">Эфф. ставка</table_1.TableHead>
                <table_1.TableHead className="w-[280px]">Действия</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {filtered.map((ts) => {
                const emp = finance_1.orgEmployees.find((e) => e.id === ts.employeeId);
                const directViewerRole = ts.status === 'manager_approved'
                    ? 'director'
                    : isDirector && ts.status !== 'submitted'
                        ? 'director'
                        : 'manager';
                const totH = (0, finance_1.totalHours)(ts);
                const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
                const normPct = Math.round((totH / STANDARD_MONTH_HOURS) * 100);
                const sal = (0, finance_1.activeSalaryFor)(finance_1.initialSalaryHistory, ts.employeeId, ts.year, ts.month);
                const agg = aggregateBlock(ts.rows, sal);
                const isOpen = !!expandedTs[ts.id];
                return (<>
                    <table_1.TableRow key={ts.id} className={(0, utils_1.cn)(isOpen && 'bg-muted/30 border-b-0')}>
                      <table_1.TableCell className="p-2">
                        <button_1.Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(ts.id)} title={isOpen ? 'Свернуть' : 'Раскрыть табель'}>
                          <span className={(0, utils_1.cn)('inline-block transition-transform text-xs', isOpen && 'rotate-90')}>
                            ▶
                          </span>
                        </button_1.Button>
                      </table_1.TableCell>
                      <table_1.TableCell className="font-medium">{emp.name}</table_1.TableCell>
                      <table_1.TableCell className="text-xs text-muted-foreground">
                        {emp.position}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <StatusBadge status={ts.status}/>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right text-sm num-tabular">
                        {ts.rows.length}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right font-mono text-sm num-tabular">
                        <span className={(0, utils_1.cn)(totH < STANDARD_MONTH_HOURS * 0.5 && 'text-amber-700', totH > STANDARD_MONTH_HOURS + 24 && 'text-rose-700')}>
                          {totH.toFixed(1)} ч
                        </span>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right text-xs num-tabular">
                        <span className={(0, utils_1.cn)(normPct < 50 && 'text-amber-700', normPct > 115 && 'text-rose-700')}>
                          {normPct}%
                        </span>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right text-xs num-tabular font-medium">
                        {(0, finance_1.formatRubInt)(agg.netTotal)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right text-xs num-tabular text-muted-foreground">
                        {totalMin > 0 ? `${(0, finance_1.formatRubInt)(agg.effRate)}/ч` : '—'}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div className="flex items-center gap-1">
                          {renderActions(ts, directViewerRole)}
                        </div>
                      </table_1.TableCell>
                    </table_1.TableRow>
                    {isOpen && (<table_1.TableRow key={`${ts.id}-exp`} className="bg-muted/10">
                        <table_1.TableCell colSpan={10} className="p-3">
                          {renderRowsTable(ts, directViewerRole)}
                        </table_1.TableCell>
                      </table_1.TableRow>)}
                  </>);
            })}
              {filtered.length === 0 && (<table_1.TableRow>
                  <table_1.TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">
                    {teamTimesheets.length === 0
                    ? 'Нет табелей подчинённых за выбранный период.'
                    : 'По выбранному фильтру табелей нет.'}
                  </table_1.TableCell>
                </table_1.TableRow>)}
            </table_1.TableBody>
          </table_1.Table>
        </div>
      </div>);
    };
    const findTs = (empId) => timesheets.find((t) => t.employeeId === empId && t.year === year && t.month === month) ?? null;
    const roleForTs = (ts) => {
        if (ts.employeeId === viewerId)
            return 'self';
        if (isDirector) {
            return ts.status === 'manager_approved' || ts.status === 'approved' ? 'director' : 'director';
        }
        return 'manager';
    };
    const renderEmployeeRow = (empId, indent = false) => {
        const emp = finance_1.orgEmployees.find((e) => e.id === empId);
        if (!emp)
            return null;
        const ts = findTs(empId);
        const sal = (0, finance_1.activeSalaryFor)(finance_1.initialSalaryHistory, empId, year, month);
        const baseRate = sal ? (0, finance_1.baseHourlyRateKop)(sal) : 0;
        const isOpen = ts ? !!expandedTs[ts.id] : false;
        if (!ts) {
            return (<table_1.TableRow key={`empty-${empId}`} className={(0, utils_1.cn)(indent && 'bg-muted/10')}>
          <table_1.TableCell className="p-2"/>
          <table_1.TableCell className={(0, utils_1.cn)('font-medium', indent && 'pl-8')}>{emp.name}</table_1.TableCell>
          <table_1.TableCell className="text-xs text-muted-foreground">{emp.position}</table_1.TableCell>
          <table_1.TableCell colSpan={7} className="text-xs text-muted-foreground italic">
            Табель за выбранный период не создан
          </table_1.TableCell>
          <table_1.TableCell />
        </table_1.TableRow>);
        }
        const totH = (0, finance_1.totalHours)(ts);
        const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
        const agg = aggregateBlock(ts.rows, sal);
        const role = roleForTs(ts);
        return (<>
        <table_1.TableRow key={ts.id} className={(0, utils_1.cn)(isOpen && 'bg-muted/30 border-b-0', indent && !isOpen && 'bg-muted/10')}>
          <table_1.TableCell className="p-2">
            <button_1.Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedTs((p) => ({ ...p, [ts.id]: !p[ts.id] }))} title={isOpen ? 'Свернуть' : 'Раскрыть табель'}>
              <span className={(0, utils_1.cn)('inline-block transition-transform text-xs', isOpen && 'rotate-90')}>
                ▶
              </span>
            </button_1.Button>
          </table_1.TableCell>
          <table_1.TableCell className={(0, utils_1.cn)('font-medium', indent && 'pl-8')}>{emp.name}</table_1.TableCell>
          <table_1.TableCell className="text-xs text-muted-foreground">{emp.position}</table_1.TableCell>
          <table_1.TableCell>
            <StatusBadge status={ts.status}/>
          </table_1.TableCell>
          <table_1.TableCell className="text-right font-mono text-xs num-tabular">
            <span className={(0, utils_1.cn)(totH < STANDARD_MONTH_HOURS * 0.5 && 'text-amber-700', totH > STANDARD_MONTH_HOURS + 24 && 'text-rose-700')}>
              {totH.toFixed(1)} ч
            </span>
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular">
            {baseRate > 0 ? `${(0, finance_1.formatRubInt)(baseRate)}/ч` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-[11px] num-tabular text-muted-foreground">
            {totalMin > 0 ? `${Math.round(agg.mgrPct * 100)}%` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-[11px] num-tabular text-muted-foreground">
            {totalMin > 0 ? `${Math.round(agg.bizPct * 100)}%` : '—'}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular font-medium">
            {(0, finance_1.formatRubInt)(agg.netTotal)}
          </table_1.TableCell>
          <table_1.TableCell className="text-right text-xs num-tabular text-muted-foreground">
            {totalMin > 0 ? `${(0, finance_1.formatRubInt)(agg.effRate)}/ч` : '—'}
          </table_1.TableCell>
          <table_1.TableCell>
            {ts.status === 'approved' && (<badge_1.Badge variant="outline" className="gap-1 text-[10px]">
                <lucide_react_1.Lock className="h-3 w-3"/> Заблокирован
              </badge_1.Badge>)}
          </table_1.TableCell>
        </table_1.TableRow>
        {isOpen && (<table_1.TableRow key={`${ts.id}-exp`} className="bg-muted/10">
            <table_1.TableCell colSpan={11} className="p-3">
              {ts.status === 'rejected' && (<div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-800 flex items-start gap-2 mb-3">
                  <lucide_react_1.XCircle className="h-4 w-4 mt-0.5 shrink-0"/>
                  <div>
                    <div className="font-medium">Табель отклонён</div>
                    <div className="text-xs">
                      {ts.history.filter((h) => h.toStatus === 'rejected').slice(-1)[0]?.comment ??
                        'Без комментария'}
                    </div>
                  </div>
                </div>)}
              <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
                {renderActions(ts, role)}
              </div>
              {renderRowsTable(ts, role)}
            </table_1.TableCell>
          </table_1.TableRow>)}
      </>);
    };
    const [unifiedSort, setUnifiedSort] = (0, react_1.useState)(null);
    const [unifiedStatusFilter, setUnifiedStatusFilter] = (0, react_1.useState)('all');
    const cycleUnifiedSort = (key) => {
        setUnifiedSort((cur) => {
            if (!cur || cur.key !== key)
                return { key, dir: 'asc' };
            if (cur.dir === 'asc')
                return { key, dir: 'desc' };
            return null;
        });
    };
    const employeeMetrics = (empId) => {
        const emp = finance_1.orgEmployees.find((e) => e.id === empId);
        const ts = findTs(empId);
        const sal = (0, finance_1.activeSalaryFor)(finance_1.initialSalaryHistory, empId, year, month);
        const baseRate = sal ? (0, finance_1.baseHourlyRateKop)(sal) : 0;
        if (!ts) {
            return {
                emp,
                ts: null,
                baseRate,
                totH: 0,
                totalMin: 0,
                agg: null,
            };
        }
        const totH = (0, finance_1.totalHours)(ts);
        const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
        const agg = aggregateBlock(ts.rows, sal);
        return { emp, ts, baseRate, totH, totalMin, agg };
    };
    const passesStatusFilter = (empId) => {
        if (unifiedStatusFilter === 'all')
            return true;
        const ts = findTs(empId);
        if (!ts)
            return false;
        return ts.status === unifiedStatusFilter;
    };
    const sortIds = (ids) => {
        if (!unifiedSort)
            return ids;
        const { key, dir } = unifiedSort;
        const arr = [...ids];
        arr.sort((a, b) => {
            const ma = employeeMetrics(a);
            const mb = employeeMetrics(b);
            const valOf = (m) => {
                switch (key) {
                    case 'name':
                        return m.emp?.name ?? '';
                    case 'position':
                        return m.emp?.position ?? '';
                    case 'status':
                        return m.ts?.status ?? 'zzz';
                    case 'hours':
                        return m.totH;
                    case 'baseRate':
                        return m.baseRate;
                    case 'mgrPct':
                        return m.agg?.mgrPct ?? -1;
                    case 'bizPct':
                        return m.agg?.bizPct ?? -1;
                    case 'netTotal':
                        return m.agg?.netTotal ?? 0;
                    case 'effRate':
                        return m.totalMin > 0 ? (m.agg?.effRate ?? 0) : -1;
                }
            };
            const va = valOf(ma);
            const vb = valOf(mb);
            let cmp = 0;
            if (typeof va === 'number' && typeof vb === 'number')
                cmp = va - vb;
            else
                cmp = String(va).localeCompare(String(vb), 'ru');
            return dir === 'asc' ? cmp : -cmp;
        });
        return arr;
    };
    const UnifiedSortHead = ({ label, sortKey, align = 'left', className, title, }) => {
        const active = unifiedSort?.key === sortKey;
        const Icon = !active ? lucide_react_1.ArrowUpDown : unifiedSort.dir === 'asc' ? lucide_react_1.ArrowUp : lucide_react_1.ArrowDown;
        return (<table_1.TableHead className={className} title={title}>
        <button type="button" onClick={() => cycleUnifiedSort(sortKey)} className={(0, utils_1.cn)('inline-flex items-center gap-1 select-none hover:text-foreground transition-colors w-full', align === 'right' ? 'justify-end' : 'justify-start', active ? 'text-foreground' : 'text-muted-foreground')}>
          <span>{label}</span>
          <Icon className={(0, utils_1.cn)('h-3 w-3 shrink-0', active ? 'opacity-100' : 'opacity-30')}/>
        </button>
      </table_1.TableHead>);
    };
    const unifiedHeader = (<table_1.TableHeader>
      <table_1.TableRow className="bg-muted/40">
        <table_1.TableHead className="w-[36px]"/>
        <UnifiedSortHead label="ФИО" sortKey="name"/>
        <UnifiedSortHead label="Должность" sortKey="position"/>
        <UnifiedSortHead label="Статус" sortKey="status" className="w-[180px]"/>
        <UnifiedSortHead label="Часы" sortKey="hours" align="right" className="text-right w-[90px]"/>
        <UnifiedSortHead label="Базовая ставка" sortKey="baseRate" align="right" className="text-right w-[120px]"/>
        <UnifiedSortHead label="Ср. % рук." sortKey="mgrPct" align="right" className="text-right w-[100px]" title="Средневзвешенный % надбавки руководителя"/>
        <UnifiedSortHead label="Ср. % бизн." sortKey="bizPct" align="right" className="text-right w-[100px]" title="Средневзвешенный % надбавки бизнеса"/>
        <UnifiedSortHead label="ЗП на руки" sortKey="netTotal" align="right" className="text-right w-[120px]"/>
        <UnifiedSortHead label="Эфф. ставка" sortKey="effRate" align="right" className="text-right w-[110px]" title="Итого на руки / часы"/>
        <table_1.TableHead className="w-[140px]"/>
      </table_1.TableRow>
    </table_1.TableHeader>);
    const STATUS_FILTER_OPTIONS = [
        { value: 'all', label: 'Все статусы' },
        { value: 'draft', label: TIMESHEET_STATUS_LABEL_RU.draft },
        { value: 'submitted', label: TIMESHEET_STATUS_LABEL_RU.submitted },
        { value: 'manager_approved', label: TIMESHEET_STATUS_LABEL_RU.manager_approved },
        { value: 'approved', label: TIMESHEET_STATUS_LABEL_RU.approved },
        { value: 'rejected', label: TIMESHEET_STATUS_LABEL_RU.rejected },
    ];
    const statusFilterControl = (<div className="flex items-center gap-2">
      <label_1.Label className="text-xs text-muted-foreground">Фильтр по статусу:</label_1.Label>
      <select_1.Select value={unifiedStatusFilter} onValueChange={(v) => setUnifiedStatusFilter(v)}>
        <select_1.SelectTrigger className="h-8 w-[200px] text-xs">
          <select_1.SelectValue />
        </select_1.SelectTrigger>
        <select_1.SelectContent>
          {STATUS_FILTER_OPTIONS.map((o) => (<select_1.SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </select_1.SelectItem>))}
        </select_1.SelectContent>
      </select_1.Select>
    </div>);
    const renderManagerGroup = (managerId) => {
        const mgr = finance_1.orgEmployees.find((e) => e.id === managerId);
        if (!mgr)
            return null;
        const subIds = finance_1.orgEmployees.filter((e) => e.managerId === managerId).map((e) => e.id);
        const mgrShown = passesStatusFilter(managerId);
        const subsShown = sortIds(subIds.filter(passesStatusFilter));
        if (!mgrShown && subsShown.length === 0)
            return null;
        return (<div key={managerId} className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 text-sm">
          <lucide_react_1.Users className="h-4 w-4 text-primary"/>
          <span className="font-semibold text-primary">{mgr.name}</span>
          <span className="text-xs text-muted-foreground">
            · {mgr.position} · подчинённых: {subIds.length}
          </span>
        </div>
        <table_1.Table>
          {unifiedHeader}
          <table_1.TableBody>
            {mgrShown && renderEmployeeRow(managerId)}
            {subsShown.map((id) => renderEmployeeRow(id, true))}
          </table_1.TableBody>
        </table_1.Table>
      </div>);
    };
    const renderUnified = () => {
        const controls = (<div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Демо-вход:</span>
          <select_1.Select value={viewerId} onValueChange={(v) => {
                setViewerId(v);
                setExpandedTs({});
            }}>
            <select_1.SelectTrigger className="h-8 w-[280px] text-xs">
              <select_1.SelectValue />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {VIEWER_OPTIONS.map((o) => (<select_1.SelectItem key={o.id} value={o.id} className="text-xs">
                  {o.label}
                </select_1.SelectItem>))}
            </select_1.SelectContent>
          </select_1.Select>
        </div>
        {statusFilterControl}
      </div>);
        if (isDirector) {
            const managerIds = Array.from(new Set(finance_1.orgEmployees.filter((e) => e.managerId === viewerId).map((e) => e.id)));
            const sortedManagerIds = sortIds(managerIds);
            return (<div className="space-y-4">
          {controls}
          {passesStatusFilter(viewerId) && (<div className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border-b text-sm">
                <lucide_react_1.UserCircle2 className="h-4 w-4 text-muted-foreground"/>
                <span className="font-semibold">Мой табель (Директор)</span>
              </div>
              <table_1.Table>
                {unifiedHeader}
                <table_1.TableBody>{renderEmployeeRow(viewerId)}</table_1.TableBody>
              </table_1.Table>
            </div>)}
          {sortedManagerIds.map((mId) => renderManagerGroup(mId))}
        </div>);
        }
        if (isManager) {
            const subIds = subordinates.map((s) => s.id);
            const sortedSubs = sortIds(subIds.filter(passesStatusFilter));
            const meShown = passesStatusFilter(viewerId);
            return (<div className="space-y-4">
          {controls}
          <div className="rounded-md border border-border overflow-hidden">
            <table_1.Table>
              {unifiedHeader}
              <table_1.TableBody>
                {meShown && renderEmployeeRow(viewerId)}
                {sortedSubs.map((id) => renderEmployeeRow(id, true))}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </div>);
        }
        return (<div className="space-y-4">
        {controls}
        <div className="rounded-md border border-border overflow-hidden">
          <table_1.Table>
            {unifiedHeader}
            <table_1.TableBody>{renderEmployeeRow(viewerId)}</table_1.TableBody>
          </table_1.Table>
        </div>
      </div>);
    };
    const rejectTs = rejectDialog ? timesheets.find((t) => t.id === rejectDialog.tsId) : null;
    const addRowTs = addRowDialog ? timesheets.find((t) => t.id === addRowDialog.tsId) : null;
    const historyTs = historyDialog ? timesheets.find((t) => t.id === historyDialog.tsId) : null;
    const addableIssues = (0, react_1.useMemo)(() => {
        if (!addRowTs)
            return [];
        const used = new Set(addRowTs.rows.map((r) => r.issueIdReadable));
        return backlogItems.filter((b) => !used.has(b.idReadable));
    }, [addRowTs]);
    return (<tooltip_1.TooltipProvider delayDuration={150}>
      <PageHeader_1.PageHeader title="Табели рабочего времени" description="Месячный ввод часов по задачам, согласование по маршруту Сотрудник → Руководитель → Директор" breadcrumbs={[{ label: 'Главная' }, { label: 'Табели' }]} actions={<div className="flex items-center gap-2">
            <select_1.Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <select_1.SelectTrigger className="h-8 w-[140px] text-xs">
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {planning_1.MONTHS_RU.map((m, i) => (<select_1.SelectItem key={i} value={String(i + 1)} className="text-xs">
                    {m}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <select_1.SelectTrigger className="h-8 w-[90px] text-xs">
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {[2025, 2026, 2027].map((y) => (<select_1.SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>}/>

      <div className="p-6 space-y-4">{renderUnified()}</div>

      
      <dialog_1.Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Отклонить табель</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Сотрудник получит уведомление с указанным комментарием и сможет скорректировать
              данные.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="space-y-2">
            <label_1.Label htmlFor="reject-comment">Комментарий (обязательно)</label_1.Label>
            <textarea_1.Textarea id="reject-comment" rows={4} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Например: уточните распределение часов между ERP-201 и ERP-204"/>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setRejectDialog(null)}>
              Отмена
            </button_1.Button>
            <button_1.Button variant="destructive" disabled={rejectComment.trim().length < 3} onClick={() => {
            if (rejectTs)
                reject(rejectTs, rejectComment.trim());
            setRejectDialog(null);
        }}>
              Отклонить
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      
      <dialog_1.Dialog open={!!addRowDialog} onOpenChange={(o) => !o && setAddRowDialog(null)}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Добавить задачу из YouTrack</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Задача будет отмечена как «Вне плана» — учитывается в фактических часах, но не входила
              в план месяца.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="space-y-2">
            <label_1.Label>Задача</label_1.Label>
            <select_1.Select value={addIssueId} onValueChange={setAddIssueId}>
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="Выберите задачу..."/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {addableIssues.map((b) => (<select_1.SelectItem key={b.idReadable} value={b.idReadable}>
                    <span className="font-mono text-xs mr-2">{b.idReadable}</span>
                    <span className="text-xs">{b.summary}</span>
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setAddRowDialog(null)}>
              Отмена
            </button_1.Button>
            <button_1.Button disabled={!addIssueId} onClick={() => {
            if (addRowTs && addIssueId)
                addRow(addRowTs, addIssueId);
            setAddIssueId('');
            setAddRowDialog(null);
        }}>
              Добавить
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      
      <dialog_1.Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <dialog_1.DialogContent className="max-w-2xl">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>История табеля</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Аудит переходов статусов и изменений строк (часы, оценки) с автором и временем.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <tabs_1.Tabs defaultValue="status">
            <tabs_1.TabsList>
              <tabs_1.TabsTrigger value="status">
                Согласование ({historyTs?.history.length ?? 0})
              </tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="rows">
                Изменения строк ({historyTs?.rowChanges.length ?? 0})
              </tabs_1.TabsTrigger>
            </tabs_1.TabsList>
            <tabs_1.TabsContent value="status" className="space-y-2 max-h-[400px] overflow-auto mt-3">
              {historyTs?.history.map((h, i) => {
            const actor = finance_1.orgEmployees.find((e) => e.id === h.actorId);
            return (<div key={i} className="border border-border rounded-md p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {h.fromStatus
                    ? `${TIMESHEET_STATUS_LABEL_RU[h.fromStatus]} → ${TIMESHEET_STATUS_LABEL_RU[h.toStatus]}`
                    : `Создан: ${TIMESHEET_STATUS_LABEL_RU[h.toStatus]}`}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(h.at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div className="text-muted-foreground">Автор: {actor?.name ?? h.actorId}</div>
                    {h.comment && <div className="italic text-foreground/80">«{h.comment}»</div>}
                  </div>);
        })}
            </tabs_1.TabsContent>
            <tabs_1.TabsContent value="rows" className="space-y-2 max-h-[400px] overflow-auto mt-3">
              {historyTs?.rowChanges.length === 0 && (<div className="text-center text-xs text-muted-foreground py-6">
                  Изменений по строкам ещё не было.
                </div>)}
              {historyTs?.rowChanges
            .slice()
            .reverse()
            .map((c, i) => {
            const actor = finance_1.orgEmployees.find((e) => e.id === c.actorId);
            const row = historyTs.rows.find((r) => r.id === c.rowId);
            const fieldLabel = {
                minutes: 'Часы',
                managerGrade: 'Оценка руководителя',
                businessGrade: 'Оценка бизнеса',
            };
            return (<div key={i} className="border border-border rounded-md p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          <span className="font-mono mr-1">{row?.issueIdReadable ?? c.rowId}</span>·{' '}
                          {fieldLabel[c.field]}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(c.at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Было:</span>{' '}
                        <span className="line-through">{c.fromValue}</span>{' '}
                        <span className="text-muted-foreground">→ Стало:</span>{' '}
                        <span className="font-medium text-emerald-700">{c.toValue}</span>
                      </div>
                      <div className="text-muted-foreground">Автор: {actor?.name ?? c.actorId}</div>
                    </div>);
        })}
            </tabs_1.TabsContent>
          </tabs_1.Tabs>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setHistoryDialog(null)}>
              Закрыть
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </tooltip_1.TooltipProvider>);
};
exports.default = Timesheets;
//# sourceMappingURL=Timesheets.js.map