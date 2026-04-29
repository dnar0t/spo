import { useMemo, useRef, useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Lock,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserCircle2,
  Users,
  X,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  PRIORITY_LABEL_RU,
  STATE_LABEL_RU,
  TYPE_LABEL_RU,
  ytIssueUrl,
  type Priority,
} from '@/data/planningMock';
import { MONTHS_RU } from '@/lib/planning';
import {
  actionsFor,
  DIRECTOR_ID,
  minutesToHoursStr,
  orgEmployees,
  parseHoursToMinutes,
  TIMESHEET_STATUS_LABEL_RU,
  totalHours,
  type Timesheet,
  type TimesheetRow,
  type TimesheetRowChange,
  type TimesheetStatus,
  type ViewerRole,
} from '@/data/timesheetsMock';
import {
  activeSalaryFor,
  baseHourlyRateKop,
  BUSINESS_GRADE_LABEL,
  computeRowFinance,
  DEFAULT_FINANCE_SETTINGS,
  formatRubInt,
  initialSalaryHistory,
  MANAGER_GRADE_LABEL,
  type BusinessGrade,
  type ManagerGrade,
} from '@/data/salaryMock';
import {
  useTimesheets,
  type TimesheetDto,
  type BacklogItemDto,
  type ProjectDto,
  type SystemDto,
  type EmployeeOrgDto,
} from '@/hooks/useTimesheets';

// Демо: переключатель «вошедшего пользователя». В проде — auth.uid().
// TODO: заменить на данные из auth-хука после интеграции с аутентификацией
const VIEWER_OPTIONS: { id: string; label: string }[] = [
  { id: 'e-dev-2', label: 'Орлова Т. М. (Сотрудник)' },
  { id: 'e-pm-2', label: 'Лебедева О. А. (Руководитель / PM)' },
  { id: 'e-pm-3', label: 'Беляев С. В. (Руководитель / PM)' },
  { id: 'e-pm-1', label: 'Морозов И. К. (Директор)' },
];

// Вспомогательная функция для преобразования DTO табеля в доменный тип Timesheet
function dtoToTimesheet(dto: TimesheetDto): Timesheet {
  return {
    id: dto.id,
    employeeId: dto.employeeId,
    year: dto.year,
    month: dto.month,
    status: dto.status,
    rows: dto.rows.map((r) => ({
      id: r.id,
      issueIdReadable: r.issueIdReadable,
      source: r.source as TimesheetRow['source'],
      minutes: r.minutes,
      comment: r.comment ?? undefined,
      managerGrade: r.managerGrade as ManagerGrade,
      businessGrade: r.businessGrade as BusinessGrade,
    })),
    rowChanges: dto.rowChanges.map((rc) => ({
      at: rc.createdAt,
      actorId: rc.actorId,
      rowId: rc.rowId,
      field: rc.field as 'minutes' | 'managerGrade' | 'businessGrade',
      fromValue: rc.fromValue,
      toValue: rc.toValue,
    })),
    history: dto.history.map((h) => ({
      at: h.createdAt,
      actorId: h.actorId,
      fromStatus: h.fromStatus as TimesheetStatus | null,
      toStatus: h.toStatus as TimesheetStatus,
      comment: h.comment ?? undefined,
    })),
  };
}

// Вспомогательная функция для получения информации о задаче из массива бэклога
function issueShort(idReadable: string, backlogItems: BacklogItemDto[]) {
  return backlogItems.find((b) => b.idReadable === idReadable) ?? null;
}

const STATUS_BADGE: Record<
  TimesheetStatus,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { className: 'bg-muted text-muted-foreground border-border', icon: ClipboardList },
  submitted: { className: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: Send },
  manager_approved: {
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    icon: ShieldCheck,
  },
  approved: {
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    icon: CheckCircle2,
  },
  rejected: { className: 'bg-rose-500/15 text-rose-700 border-rose-500/30', icon: XCircle },
};

const STANDARD_MONTH_HOURS = 168;

function StatusBadge({ status }: { status: TimesheetStatus }) {
  const { className, icon: Icon } = STATUS_BADGE[status];
  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', className)}>
      <Icon className="h-3 w-3" />
      {TIMESHEET_STATUS_LABEL_RU[status]}
    </Badge>
  );
}

const PRIORITY_BADGE: Record<Priority, string> = {
  Blocker: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  High: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  Low: 'bg-muted text-muted-foreground border-border',
};

// Вычисление взвешенных процентов и эффективной ставки по группе строк.
function aggregateBlock(rows: TimesheetRow[], activeSalary: ReturnType<typeof activeSalaryFor>) {
  let minutes = 0;
  let baseSum = 0;
  let mgrSum = 0;
  let bizSum = 0;
  for (const r of rows) {
    const f = computeRowFinance(
      r.minutes,
      activeSalary,
      r.managerGrade,
      r.businessGrade,
      DEFAULT_FINANCE_SETTINGS,
    );
    minutes += r.minutes;
    baseSum += f.baseSumKop;
    mgrSum += f.managerSumKop;
    bizSum += f.businessSumKop;
  }
  const baseRate = activeSalary ? baseHourlyRateKop(activeSalary) : 0;
  const baseGrossKop = Math.round((minutes / 60) * baseRate); // часы × базовая ставка (100%)
  // Средневзвешенные проценты = факт.сумма / (часы × ставка). При нулевых часах — 0.
  const mgrPct = baseGrossKop > 0 ? mgrSum / baseGrossKop : 0;
  const bizPct = baseGrossKop > 0 ? bizSum / baseGrossKop : 0;
  const netTotal = baseSum + mgrSum + bizSum;
  const effRate = minutes > 0 ? Math.round(netTotal / (minutes / 60)) : 0;
  return { minutes, baseSum, mgrSum, bizSum, mgrPct, bizPct, netTotal, effRate };
}

// Ячейка ввода часов с подтверждением (✓) и отменой (✕). Изменение пишется в журнал.
// Module-level — чтобы при ререндере родителя локальный state не сбрасывался,
// и onMouseDown срабатывал до возможного ремаунта/blur.
function HoursCell({
  minutes,
  canEdit,
  onCommit,
}: {
  minutes: number;
  canEdit: boolean;
  onCommit: (newMinutes: number, fromLabel: string, toLabel: string) => void;
}) {
  const initial = minutesToHoursStr(minutes);
  const [draft, setDraft] = useState(initial);
  const lastInitialRef = useRef(initial);
  if (lastInitialRef.current !== initial) {
    lastInitialRef.current = initial;
    if (draft !== initial) setDraft(initial);
  }
  const dirty = draft.trim() !== initial;
  if (!canEdit) {
    return <span className="font-mono text-xs num-tabular">{initial} ч</span>;
  }
  const commit = () => {
    const newMin = parseHoursToMinutes(draft);
    if (newMin === minutes) {
      setDraft(minutesToHoursStr(minutes));
      return;
    }
    onCommit(newMin, `${minutesToHoursStr(minutes)} ч`, `${minutesToHoursStr(newMin)} ч`);
  };
  const cancel = () => setDraft(initial);
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        className="h-7 text-right w-[64px] num-tabular text-xs px-1.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
      />
      {dirty && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10"
            title="Сохранить и записать в историю"
            onMouseDown={(e) => {
              e.preventDefault();
              commit();
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            title="Отменить изменение"
            onMouseDown={(e) => {
              e.preventDefault();
              cancel();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

// Ячейка-селектор оценки (руководителя или бизнеса) с записью в журнал.
function GradeCell<T extends string>({
  value,
  options,
  canEdit,
  onChange,
}: {
  value: T;
  options: Record<T, string>;
  canEdit: boolean;
  onChange: (next: T, fromLabel: string, toLabel: string) => void;
}) {
  if (!canEdit) {
    return (
      <span className={cn('text-[11px]', value === 'none' ? 'text-muted-foreground italic' : '')}>
        {options[value]}
      </span>
    );
  }
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === value) return;
        onChange(v as T, options[value], options[v as T]);
      }}
    >
      <SelectTrigger className="h-7 text-[11px] px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(options) as T[]).map((k) => (
          <SelectItem key={k} value={k} className="text-xs">
            {options[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const Timesheets = () => {
  const { toast } = useToast();

  const tsApi = useTimesheets();

  // ====== Запросы к API ======
  const [viewerId, setViewerId] = useState('e-dev-2');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

  // Диалоги
  const [rejectDialog, setRejectDialog] = useState<{ tsId: string } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [addRowDialog, setAddRowDialog] = useState<{ tsId: string } | null>(null);
  const [addIssueId, setAddIssueId] = useState<string>('');
  const [historyDialog, setHistoryDialog] = useState<{ tsId: string } | null>(null);

  // ====== Данные с API ======

  // Периоды — для определения доступных месяцев
  const { data: periodsData } = tsApi.usePeriods(1, 100);
  const periods = periodsData?.data ?? [];

  // Бэклог — для поиска задач при добавлении строки и отображения информации о задаче
  const { data: backlogData } = tsApi.useBacklog({ page: 1, limit: 200 });
  const backlogItems: BacklogItemDto[] = backlogData?.data ?? [];

  // Справочники — проекты и системы
  const { data: dictionariesData } = tsApi.useDictionaries();
  const projects: ProjectDto[] = dictionariesData?.projects ?? [];
  const systems: SystemDto[] = dictionariesData?.systems ?? [];

  // Мой табель
  const { data: myTimesheetDto } = tsApi.useMyTimesheet(year, month);
  const myTimesheet: Timesheet | null = useMemo(
    () => (myTimesheetDto ? dtoToTimesheet(myTimesheetDto) : null),
    [myTimesheetDto],
  );

  // Табели команды
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const { data: teamTimesheetsDto } = tsApi.useTeamTimesheets(year, month, subordinateIds);

  const teamTimesheets: Timesheet[] = useMemo(
    () => (teamTimesheetsDto ?? []).map(dtoToTimesheet),
    [teamTimesheetsDto],
  );

  // Для обратной совместимости — собираем все табели в один массив
  const timesheets: Timesheet[] = useMemo(() => {
    const arr: Timesheet[] = [];
    if (myTimesheet) arr.push(myTimesheet);
    for (const t of teamTimesheets) {
      if (!arr.find((x) => x.id === t.id)) arr.push(t);
    }
    return arr;
  }, [myTimesheet, teamTimesheets]);

  // Сотрудники из табелей команды + текущий пользователь
  // Используем поле employeeId из табелей как источник списка сотрудников.
  // В перспективе — заменить на запрос к API справочника сотрудников.
  const employeesInTimesheets: EmployeeOrgDto[] = useMemo(() => {
    const seen = new Set<string>();
    const result: EmployeeOrgDto[] = [];
    const addEmp = (empId: string) => {
      if (seen.has(empId)) return;
      seen.add(empId);
      // Определяем роль: если у сотрудника есть подчинённые — это руководитель
      const isMgr = teamTimesheetsDto?.some(
        (t) => t.employeeId !== empId && subordinateIds.includes(t.employeeId),
      );
      result.push({
        id: empId,
        name: empId, // будет заменено при рендере
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

  // Определяем, кто директор
  const viewerIsDirector = viewerId === DIRECTOR_ID;
  const isDirector = viewerIsDirector;

  // Подчинённые (для совместимости — из teamTimesheets, исключая себя)
  const subordinates = useMemo(
    () => employeesInTimesheets.filter((e) => e.id !== viewerId),
    [employeesInTimesheets, viewerId],
  );
  const isManager = subordinates.length > 0;

  // KPI команды
  const teamStats = useMemo(() => {
    const byStatus: Record<TimesheetStatus, number> = {
      draft: 0,
      submitted: 0,
      manager_approved: 0,
      approved: 0,
      rejected: 0,
    };
    let totalH = 0;
    for (const t of teamTimesheets) {
      byStatus[t.status]++;
      totalH += totalHours(t);
    }
    const pending = byStatus.submitted + (isDirector ? byStatus.manager_approved : 0);
    return { byStatus, totalH, pending, count: teamTimesheets.length };
  }, [teamTimesheets, isDirector]);

  // При изменении viewerId обновляем список подчинённых
  // TODO: заменить на API /api/timesheets/team, когда backend будет поддерживать
  // автоматическое определение подчинённых по роли текущего пользователя
  useEffect(() => {
    // Для демо — подчинённые определяются статически
    const allIds: string[] = [];
    // Если директор — видит всех
    if (viewerId === DIRECTOR_ID) {
      // Все id, кроме директора (в пром-коде — через API оргструктуры)
      // Пока используем захардкоженный список для демо
      allIds.push(
        'e-dev-1',
        'e-dev-2',
        'e-dev-3',
        'e-dev-4',
        'e-dev-5',
        'e-dev-6',
        'e-dev-7',
        'e-dev-8',
        'e-dev-9',
        'e-dev-10',
        'e-dev-11',
        'e-dev-12',
        'e-qa-1',
        'e-qa-2',
        'e-qa-3',
        'e-pm-2',
        'e-pm-3',
      );
    } else if (viewerId === 'e-pm-2') {
      allIds.push('e-dev-1', 'e-dev-2', 'e-dev-3', 'e-dev-4', 'e-dev-5', 'e-dev-6');
    } else if (viewerId === 'e-pm-3') {
      allIds.push(
        'e-dev-7',
        'e-dev-8',
        'e-dev-9',
        'e-dev-10',
        'e-dev-11',
        'e-dev-12',
        'e-qa-1',
        'e-qa-2',
        'e-qa-3',
      );
    }
    setSubordinateIds(allIds);
  }, [viewerId]);

  // ---- Mutators (используют мутации useTimesheets) ----
  const updateRowMutation = tsApi.useUpdateRow();
  const addRowMutation = tsApi.useAddRow();
  const deleteRowMutation = tsApi.useDeleteRow();
  const submitMutation = tsApi.useSubmit();
  const recallMutation = tsApi.useRecall();
  const managerApproveMutation = tsApi.useManagerApprove();
  const directorApproveMutation = tsApi.useDirectorApprove();
  const rejectMutation = tsApi.useReject();

  const upsertTs = (next: Timesheet) => {
    // После мутации react-query инвалидирует кэш и перезагружает данные
    toast({
      title: 'Табель обновлён',
      description: 'Изменения сохранены.',
    });
  };

  const transition = (
    ts: Timesheet,
    toStatus: TimesheetStatus,
    actorId: string,
    comment?: string,
  ): Timesheet => ({
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

  // updateRow + запись изменений в журнал rowChanges (ТЗ: аудит изменений в табеле).
  const updateRow = (
    ts: Timesheet,
    rowId: string,
    patch: Partial<TimesheetRow>,
    audit?: { field: TimesheetRowChange['field']; from: string; to: string },
  ) => {
    const change: TimesheetRowChange | null = audit
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

  const removeRow = (ts: Timesheet, rowId: string) => {
    upsertTs({ ...ts, rows: ts.rows.filter((r) => r.id !== rowId) });
  };

  const addRow = (ts: Timesheet, issueIdReadable: string) => {
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

  const submit = (ts: Timesheet) => {
    upsertTs(transition(ts, 'submitted', viewerId));
    toast({ title: 'Табель отправлен на согласование' });
  };
  const recall = (ts: Timesheet) => {
    upsertTs(transition(ts, 'draft', viewerId, 'Отозван автором'));
    toast({ title: 'Табель возвращён в черновик' });
  };
  const managerApprove = (ts: Timesheet) => {
    upsertTs(transition(ts, 'manager_approved', viewerId));
    toast({ title: 'Согласовано руководителем' });
  };
  const directorApprove = (ts: Timesheet) => {
    upsertTs(transition(ts, 'approved', viewerId));
    toast({ title: 'Утверждено директором — табель заблокирован' });
  };
  const reject = (ts: Timesheet, comment: string) => {
    upsertTs(transition(ts, 'rejected', viewerId, comment));
    toast({ title: 'Табель отклонён', description: 'Сотрудник получит уведомление' });
  };

  // ---- Renderers ----

  // Сортировка по колонкам блока. Состояние храним по ключу `${tsId}:${blockKey}`.
  type SortKey =
    | 'project'
    | 'system'
    | 'type'
    | 'priority'
    | 'id'
    | 'summary'
    | 'state'
    | 'planHours'
    | 'readiness'
    | 'hours'
    | 'baseSum'
    | 'mgrPct'
    | 'mgrSum'
    | 'bizPct'
    | 'bizSum'
    | 'netTotal'
    | 'effRate';
  type SortDir = 'asc' | 'desc';
  const [sortState, setSortState] = useState<Record<string, { key: SortKey; dir: SortDir } | null>>(
    {},
  );

  const cycleSort = (storeKey: string, key: SortKey) => {
    setSortState((prev) => {
      const cur = prev[storeKey];
      let next: { key: SortKey; dir: SortDir } | null;
      if (!cur || cur.key !== key) next = { key, dir: 'asc' };
      else if (cur.dir === 'asc') next = { key, dir: 'desc' };
      else next = null;
      return { ...prev, [storeKey]: next };
    });
  };

  const renderRowsTable = (ts: Timesheet, viewerRole: ViewerRole) => {
    const flags = actionsFor(viewerRole, ts.status);
    const total = ts.rows.reduce((s, r) => s + r.minutes, 0);
    const totalH = total / 60;
    const overflow = totalH > STANDARD_MONTH_HOURS + 24;

    const planRows = ts.rows.filter((r) => r.source === 'plan');
    const offRows = ts.rows.filter((r) => r.source === 'worklog');

    // Действующая ставка владельца табеля на месяц расчёта (ТЗ §14.2).
    const activeSalary = activeSalaryFor(initialSalaryHistory, ts.employeeId, ts.year, ts.month);
    // Только директор может менять оценку бизнеса; руководитель — оценку руководителя.
    const canEditManagerGrade =
      flags.canEdit && (viewerRole === 'manager' || viewerRole === 'director');
    const canEditBusinessGrade = flags.canEdit && viewerRole === 'director';

    // Значение для сортировки строки по выбранному ключу.
    const sortValue = (row: TimesheetRow, key: SortKey): string | number => {
      const issue = issueShort(row.issueIdReadable, backlogItems);
      const proj = issue ? projects.find((p) => p.id === issue.projectId) : undefined;
      const sys = issue ? systems.find((s) => s.id === issue.systemId) : undefined;
      const fin = computeRowFinance(
        row.minutes,
        activeSalary,
        row.managerGrade,
        row.businessGrade,
        DEFAULT_FINANCE_SETTINGS,
      );
      // Карта приоритетов для осмысленной сортировки.
      const priorityRank: Record<Priority, number> = {
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

    const applySort = (rows: TimesheetRow[], storeKey: string): TimesheetRow[] => {
      const s = sortState[storeKey];
      if (!s) return rows;
      const sorted = [...rows].sort((a, b) => {
        const va = sortValue(a, s.key);
        const vb = sortValue(b, s.key);
        if (typeof va === 'number' && typeof vb === 'number') return va - vb;
        return String(va).localeCompare(String(vb), 'ru');
      });
      if (s.dir === 'desc') sorted.reverse();
      return sorted;
    };

    const renderRow = (row: TimesheetRow) => {
      const issue = issueShort(row.issueIdReadable, backlogItems);
      const proj = issue ? projects.find((p) => p.id === issue.projectId) : undefined;
      const sys = issue ? systems.find((s) => s.id === issue.systemId) : undefined;
      const fin = computeRowFinance(
        row.minutes,
        activeSalary,
        row.managerGrade,
        row.businessGrade,
        DEFAULT_FINANCE_SETTINGS,
      );
      return (
        <TableRow key={row.id} className="h-9 [&>td]:py-1 [&>td]:px-3">
          <TableCell className="text-xs">{proj?.shortName ?? '—'}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{sys?.name ?? '—'}</TableCell>
          <TableCell className="text-xs">{issue ? TYPE_LABEL_RU[issue.type] : '—'}</TableCell>
          <TableCell>
            {issue && (
              <Badge
                variant="outline"
                className={cn(
                  'font-normal text-[9px] px-1.5 py-0 leading-4',
                  PRIORITY_BADGE[issue.priority],
                )}
              >
                {PRIORITY_LABEL_RU[issue.priority]}
              </Badge>
            )}
          </TableCell>
          <TableCell className="font-mono text-xs">
            <a
              href={ytIssueUrl(row.issueIdReadable)}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {row.issueIdReadable}
            </a>
          </TableCell>
          <TableCell className="text-sm min-w-[220px]">
            <div className="line-clamp-2">{issue?.summary ?? '—'}</div>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">
            {issue ? STATE_LABEL_RU[issue.state] : '—'}
          </TableCell>
          <TableCell className="text-right text-xs num-tabular">
            {issue ? `${issue.estimateHours} ч` : '—'}
          </TableCell>
          <TableCell className="text-right text-xs num-tabular">
            {issue ? `${issue.readiness}%` : '—'}
          </TableCell>
          <TableCell className="text-right">
            <HoursCell
              minutes={row.minutes}
              canEdit={flags.canEdit}
              onCommit={(newMin, fromLabel, toLabel) => {
                updateRow(
                  ts,
                  row.id,
                  { minutes: newMin },
                  { field: 'minutes', from: fromLabel, to: toLabel },
                );
                toast({
                  title: 'Часы сохранены',
                  description: `${row.issueIdReadable}: ${fromLabel} → ${toLabel}`,
                });
              }}
            />
          </TableCell>
          {/* ---- Финансовые колонки (ТЗ §16.2) — без столбца «Ставка», она в сводке выше ---- */}
          <TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {formatRubInt(fin.baseSumKop)}
          </TableCell>
          <TableCell className="bg-muted/20">
            <GradeCell
              value={row.managerGrade}
              options={MANAGER_GRADE_LABEL}
              canEdit={canEditManagerGrade}
              onChange={(v, fromLabel, toLabel) =>
                updateRow(
                  ts,
                  row.id,
                  { managerGrade: v as ManagerGrade },
                  { field: 'managerGrade', from: fromLabel, to: toLabel },
                )
              }
            />
          </TableCell>
          <TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {formatRubInt(fin.managerSumKop)}
          </TableCell>
          <TableCell className="bg-muted/20">
            <GradeCell
              value={row.businessGrade}
              options={BUSINESS_GRADE_LABEL}
              canEdit={canEditBusinessGrade}
              onChange={(v, fromLabel, toLabel) =>
                updateRow(
                  ts,
                  row.id,
                  { businessGrade: v as BusinessGrade },
                  { field: 'businessGrade', from: fromLabel, to: toLabel },
                )
              }
            />
          </TableCell>
          <TableCell className="text-right text-[11px] num-tabular bg-muted/20">
            {formatRubInt(fin.businessSumKop)}
          </TableCell>
          <TableCell className="text-right text-xs num-tabular font-medium bg-muted/30">
            {formatRubInt(fin.netTotalKop)}
          </TableCell>
          <TableCell className="text-right text-[11px] num-tabular text-muted-foreground bg-muted/20">
            {row.minutes > 0 ? `${formatRubInt(fin.effectiveRateKop)}/ч` : '—'}
          </TableCell>
          <TableCell>
            {flags.canEdit && row.source === 'worklog' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(ts, row.id)}
                title="Удалить строку"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </TableCell>
        </TableRow>
      );
    };

    // Заголовок-кнопка с индикатором сортировки.
    const SortHead = ({
      label,
      sortKey,
      storeKey,
      align = 'left',
      className,
      title,
    }: {
      label: string;
      sortKey: SortKey;
      storeKey: string;
      align?: 'left' | 'right';
      className?: string;
      title?: string;
    }) => {
      const s = sortState[storeKey];
      const active = s?.key === sortKey;
      const Icon = !active ? ArrowUpDown : s!.dir === 'asc' ? ArrowUp : ArrowDown;
      return (
        <TableHead className={className} title={title}>
          <button
            type="button"
            onClick={() => cycleSort(storeKey, sortKey)}
            className={cn(
              'inline-flex items-center gap-1 select-none hover:text-foreground transition-colors w-full',
              align === 'right' ? 'justify-end' : 'justify-start',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span>{label}</span>
            <Icon className={cn('h-3 w-3 shrink-0', active ? 'opacity-100' : 'opacity-30')} />
          </button>
        </TableHead>
      );
    };

    const headerRow = (storeKey: string) => (
      <TableRow className="bg-muted/40 h-9 [&>th]:h-9 [&>th]:py-1 [&>th]:px-3">
        <SortHead label="Проект" sortKey="project" storeKey={storeKey} className="w-[60px]" />
        <SortHead label="Система" sortKey="system" storeKey={storeKey} className="w-[90px]" />
        <SortHead label="Тип" sortKey="type" storeKey={storeKey} className="w-[60px]" />
        <SortHead label="Приор." sortKey="priority" storeKey={storeKey} className="w-[80px]" />
        <SortHead label="ID" sortKey="id" storeKey={storeKey} className="w-[90px]" />
        <SortHead
          label="Название задачи"
          sortKey="summary"
          storeKey={storeKey}
          className="min-w-[220px]"
        />
        <SortHead label="Статус" sortKey="state" storeKey={storeKey} className="w-[100px]" />
        <SortHead
          label="Часы плана"
          sortKey="planHours"
          storeKey={storeKey}
          align="right"
          className="w-[80px] text-right"
        />
        <SortHead
          label="Готов."
          sortKey="readiness"
          storeKey={storeKey}
          align="right"
          className="w-[80px] text-right"
        />
        <SortHead
          label="Часы"
          sortKey="hours"
          storeKey={storeKey}
          align="right"
          className="w-[140px] text-right"
        />
        {/* Финансовый блок — без «Ставки», она в сводке выше */}
        <SortHead
          label="Сум. базовая"
          sortKey="baseSum"
          storeKey={storeKey}
          align="right"
          className="w-[100px] text-right bg-muted/20"
          title="Часы × ставка × базовый %"
        />
        <SortHead
          label="% от руководителя"
          sortKey="mgrPct"
          storeKey={storeKey}
          className="w-[140px] bg-muted/20"
        />
        <SortHead
          label="Сум. рук."
          sortKey="mgrSum"
          storeKey={storeKey}
          align="right"
          className="w-[100px] text-right bg-muted/20"
        />
        <SortHead
          label="% от бизнеса"
          sortKey="bizPct"
          storeKey={storeKey}
          className="w-[140px] bg-muted/20"
        />
        <SortHead
          label="Сум. бизн."
          sortKey="bizSum"
          storeKey={storeKey}
          align="right"
          className="w-[100px] text-right bg-muted/20"
        />
        <SortHead
          label="Итого на руки"
          sortKey="netTotal"
          storeKey={storeKey}
          align="right"
          className="w-[110px] text-right bg-muted/30"
        />
        <SortHead
          label="Эфф. ставка"
          sortKey="effRate"
          storeKey={storeKey}
          align="right"
          className="w-[100px] text-right bg-muted/20"
          title="Итого на руки / часы"
        />
        <TableHead className="w-[44px]"></TableHead>
      </TableRow>
    );

    // Итоговая строка под шапкой таблицы. Толщина = как у шапки (h-9, font-medium),
    // цвет — отличный от шапки (accent/40), чтобы выделяться.
    const renderTotalsRow = (rows: TimesheetRow[]) => {
      const agg = aggregateBlock(rows, activeSalary);
      const planHoursSum = rows.reduce(
        (s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.estimateHours ?? 0),
        0,
      );
      const readinessNum = rows.reduce(
        (s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.readiness ?? 0) * r.minutes,
        0,
      );
      const readinessAvg = agg.minutes > 0 ? Math.round(readinessNum / agg.minutes) : 0;
      const rowToneClass =
        'h-9 bg-accent/10 hover:bg-accent/10 font-medium border-y border-border/60';
      return (
        <TableRow className={rowToneClass}>
          <TableCell
            colSpan={7}
            className="py-1 px-3 text-xs uppercase tracking-wide text-muted-foreground"
          >
            Итого · {rows.length} зад.
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {planHoursSum} ч
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {rows.length > 0 ? `${readinessAvg}%` : '—'}
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-xs num-tabular">
            {minutesToHoursStr(agg.minutes)} ч
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {formatRubInt(agg.baseSum)}
          </TableCell>
          <TableCell className="py-1 px-3 text-[11px] num-tabular bg-accent/15 text-muted-foreground">
            ср. {Math.round(agg.mgrPct * 100)}%
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {formatRubInt(agg.mgrSum)}
          </TableCell>
          <TableCell className="py-1 px-3 text-[11px] num-tabular bg-accent/15 text-muted-foreground">
            ср. {Math.round(agg.bizPct * 100)}%
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {formatRubInt(agg.bizSum)}
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-xs num-tabular font-semibold bg-accent/20">
            {formatRubInt(agg.netTotal)}
          </TableCell>
          <TableCell className="py-1 px-3 text-right text-[11px] num-tabular bg-accent/15">
            {agg.minutes > 0 ? `${formatRubInt(agg.effRate)}/ч` : '—'}
          </TableCell>
          <TableCell className="py-1 px-3" />
        </TableRow>
      );
    };

    const renderBlock = (
      title: string,
      subtitle: string,
      rows: TimesheetRow[],
      tone: 'plan' | 'off',
      emptyHint: string,
      blockKey: 'plan' | 'off',
    ) => {
      const storeKey = `${ts.id}:${blockKey}`;
      const sortedRows = applySort(rows, storeKey);
      return (
        <div
          className={cn(
            'rounded-md border overflow-hidden',
            tone === 'plan' ? 'border-primary/30' : 'border-amber-500/30',
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2 border-b text-sm',
              tone === 'plan'
                ? 'bg-primary/5 border-primary/20 text-primary'
                : 'bg-amber-500/5 border-amber-500/20 text-amber-800',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{title}</span>
              <span className="text-xs opacity-70">· {subtitle}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>{headerRow(storeKey)}</TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={18}
                      className="text-center text-muted-foreground text-xs py-4"
                    >
                      {emptyHint}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {renderTotalsRow(rows)}
                    {sortedRows.map(renderRow)}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    };

    const baseRate = activeSalary ? baseHourlyRateKop(activeSalary) : 0;

    return (
      <div className="space-y-3">
        {/* Сводка по ставке владельца табеля */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 rounded-md border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Базовая ставка:{' '}
            <span className="font-medium text-foreground num-tabular">
              {activeSalary ? `${formatRubInt(baseRate)}/ч` : 'ставка не задана'}
            </span>
          </span>
          {activeSalary && (
            <>
              <span className="text-muted-foreground">
                ЗП на руки/мес:{' '}
                <span className="font-medium text-foreground num-tabular">
                  {formatRubInt(activeSalary.monthlyNetKop)}
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
            </>
          )}
          <span className="text-muted-foreground">
            Базовый %:{' '}
            <span className="font-medium text-foreground">
              {Math.round(DEFAULT_FINANCE_SETTINGS.basePercent * 100)}%
            </span>
          </span>
          <span
            className={cn(
              'ml-auto',
              overflow ? 'text-amber-700 font-medium' : 'text-muted-foreground',
            )}
          >
            Норма / итого, ч:{' '}
            <span className="font-medium num-tabular">
              {STANDARD_MONTH_HOURS} / {minutesToHoursStr(total)}
            </span>
            {overflow && <AlertCircle className="inline h-3 w-3 ml-1 text-amber-700" />}
          </span>
        </div>

        {renderBlock(
          'План месяца',
          'задачи, назначенные в Планировании',
          planRows,
          'plan',
          'В плане месяца нет задач для этого сотрудника.',
          'plan',
        )}
        {renderBlock(
          'Вне плана',
          'задачи из YouTrack, в которые списывались часы',
          offRows,
          'off',
          'Внеплановых задач нет.',
          'off',
        )}
        {/* Сводный итог по обоим блокам — вне таблиц. */}
        {(() => {
          const allRows = [...planRows, ...offRows];
          if (allRows.length === 0) return null;
          const agg = aggregateBlock(allRows, activeSalary);
          const planHoursSum = allRows.reduce(
            (s, r) => s + (issueShort(r.issueIdReadable, backlogItems)?.estimateHours ?? 0),
            0,
          );
          return (
            <div className="rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5">
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
                    {minutesToHoursStr(agg.minutes)} ч
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Сум. базовая:{' '}
                  <span className="font-medium text-foreground num-tabular">
                    {formatRubInt(agg.baseSum)}
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
                    {formatRubInt(agg.mgrSum)}
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
                    {formatRubInt(agg.bizSum)}
                  </span>
                </span>
                <span className="ml-auto flex items-center gap-x-4 gap-y-1 flex-wrap">
                  <span className="text-muted-foreground">
                    Эфф. ставка:{' '}
                    <span className="font-medium text-foreground num-tabular">
                      {agg.minutes > 0 ? `${formatRubInt(agg.effRate)}/ч` : '—'}
                    </span>
                  </span>
                  <span className="text-primary font-semibold">
                    Итого на руки: <span className="num-tabular">{formatRubInt(agg.netTotal)}</span>
                  </span>
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderActions = (ts: Timesheet, viewerRole: ViewerRole) => {
    const flags = actionsFor(viewerRole, ts.status);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {flags.canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAddRowDialog({ tsId: ts.id })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Добавить задачу
          </Button>
        )}
        {flags.canSubmit && (
          <Button size="sm" onClick={() => submit(ts)}>
            <Send className="h-3.5 w-3.5 mr-1" /> Отправить на согласование
          </Button>
        )}
        {flags.canRecall && (
          <Button size="sm" variant="outline" onClick={() => recall(ts)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Отозвать
          </Button>
        )}
        {flags.canManagerApprove && (
          <Button size="sm" onClick={() => managerApprove(ts)}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Согласовать
          </Button>
        )}
        {flags.canDirectorApprove && (
          <Button size="sm" onClick={() => directorApprove(ts)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Утвердить
          </Button>
        )}
        {flags.canReject && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setRejectComment('');
              setRejectDialog({ tsId: ts.id });
            }}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Отклонить
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setHistoryDialog({ tsId: ts.id })}>
          История
        </Button>
        {ts.status === 'approved' && (
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> Заблокирован
          </Badge>
        )}
      </div>
    );
  };

  const renderMy = () => {
    if (!myTimesheet) {
      return (
        <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md">
          Табель за выбранный период не найден.
        </div>
      );
    }
    const ts = myTimesheet;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <UserCircle2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{viewerId}</div>
              <div className="text-xs text-muted-foreground">Сотрудник</div>
            </div>
            <StatusBadge status={ts.status} />
          </div>
          {renderActions(ts, 'self')}
        </div>
        {ts.status === 'rejected' && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-800 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Табель отклонён руководителем</div>
              <div className="text-xs">
                {ts.history.filter((h) => h.toStatus === 'rejected').slice(-1)[0]?.comment ??
                  'Без комментария'}
              </div>
            </div>
          </div>
        )}
        {renderRowsTable(ts, 'self')}
      </div>
    );
  };

  // Локальное состояние вкладки команды: фильтр по статусу + раскрытые табели.
  const [teamStatusFilter, setTeamStatusFilter] = useState<TimesheetStatus | 'all' | 'pending'>(
    'pending',
  );
  const [expandedTs, setExpandedTs] = useState<Record<string, boolean>>({});

  const renderTeam = () => {
    if (!isManager) {
      return (
        <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-md">
          У вас нет подчинённых сотрудников.
        </div>
      );
    }

    const directorViewer = isDirector;
    const filtered = teamTimesheets.filter((ts) => {
      if (teamStatusFilter === 'all') return true;
      if (teamStatusFilter === 'pending') {
        return ts.status === 'submitted' || (directorViewer && ts.status === 'manager_approved');
      }
      return ts.status === teamStatusFilter;
    });

    const filterOptions: { value: typeof teamStatusFilter; label: string; count: number }[] = [
      {
        value: 'pending',
        label: 'Требуют действия',
        count:
          teamStats.byStatus.submitted + (directorViewer ? teamStats.byStatus.manager_approved : 0),
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

    const toggleExpand = (id: string) => setExpandedTs((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
      <div className="space-y-4">
        {/* KPI команды */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Сотрудников в команде" value={String(teamStats.count)} icon={Users} />
          <KpiCard
            label="Ожидают вашего согласования"
            value={String(teamStats.pending)}
            icon={Send}
            accent={teamStats.pending > 0 ? 'warning' : 'primary'}
          />
          <KpiCard
            label="Утверждено"
            value={String(teamStats.byStatus.approved)}
            icon={CheckCircle2}
            accent="success"
          />
          <KpiCard
            label="Часов всего"
            value={`${teamStats.totalH.toFixed(0)} ч`}
            icon={ClipboardList}
          />
        </div>

        {/* Фильтр статусов в виде чипов */}
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setTeamStatusFilter(o.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors',
                teamStatusFilter === o.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted',
              )}
            >
              {o.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium',
                  teamStatusFilter === o.value
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {o.count}
              </span>
            </button>
          ))}
        </div>

        {/* Таблица табелей подчинённых */}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[36px]"></TableHead>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Строк</TableHead>
                <TableHead className="text-right">Часы</TableHead>
                <TableHead className="text-right">К норме</TableHead>
                <TableHead className="text-right">На руки</TableHead>
                <TableHead className="text-right">Эфф. ставка</TableHead>
                <TableHead className="w-[280px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ts) => {
                const emp = orgEmployees.find((e) => e.id === ts.employeeId)!;
                const directViewerRole: ViewerRole =
                  ts.status === 'manager_approved'
                    ? 'director'
                    : isDirector && ts.status !== 'submitted'
                      ? 'director'
                      : 'manager';
                const totH = totalHours(ts);
                const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
                const normPct = Math.round((totH / STANDARD_MONTH_HOURS) * 100);
                const sal = activeSalaryFor(initialSalaryHistory, ts.employeeId, ts.year, ts.month);
                const agg = aggregateBlock(ts.rows, sal);
                const isOpen = !!expandedTs[ts.id];
                return (
                  <>
                    <TableRow key={ts.id} className={cn(isOpen && 'bg-muted/30 border-b-0')}>
                      <TableCell className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpand(ts.id)}
                          title={isOpen ? 'Свернуть' : 'Раскрыть табель'}
                        >
                          <span
                            className={cn(
                              'inline-block transition-transform text-xs',
                              isOpen && 'rotate-90',
                            )}
                          >
                            ▶
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {emp.position}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ts.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm num-tabular">
                        {ts.rows.length}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm num-tabular">
                        <span
                          className={cn(
                            totH < STANDARD_MONTH_HOURS * 0.5 && 'text-amber-700',
                            totH > STANDARD_MONTH_HOURS + 24 && 'text-rose-700',
                          )}
                        >
                          {totH.toFixed(1)} ч
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs num-tabular">
                        <span
                          className={cn(
                            normPct < 50 && 'text-amber-700',
                            normPct > 115 && 'text-rose-700',
                          )}
                        >
                          {normPct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs num-tabular font-medium">
                        {formatRubInt(agg.netTotal)}
                      </TableCell>
                      <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                        {totalMin > 0 ? `${formatRubInt(agg.effRate)}/ч` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {renderActions(ts, directViewerRole)}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={`${ts.id}-exp`} className="bg-muted/10">
                        <TableCell colSpan={10} className="p-3">
                          {renderRowsTable(ts, directViewerRole)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-8 text-sm"
                  >
                    {teamTimesheets.length === 0
                      ? 'Нет табелей подчинённых за выбранный период.'
                      : 'По выбранному фильтру табелей нет.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // ---- Унифицированный список табелей ----
  // Сотрудник видит только свою строку. Руководитель — себя + прямых/косвенных подчинённых.
  // Директор — всех подчинённых, сгруппированных по их непосредственным руководителям.

  // Найти табель сотрудника за выбранный период.
  const findTs = (empId: string): Timesheet | null =>
    timesheets.find((t) => t.employeeId === empId && t.year === year && t.month === month) ?? null;

  // Определить роль просмотра конкретного табеля для текущего viewer.
  const roleForTs = (ts: Timesheet): ViewerRole => {
    if (ts.employeeId === viewerId) return 'self';
    if (isDirector) {
      // Директор может действовать как директор (на manager_approved) или как
      // руководитель за PM (на submitted) — это уже учтено в actionsFor.
      return ts.status === 'manager_approved' || ts.status === 'approved' ? 'director' : 'director';
    }
    return 'manager';
  };

  // Сводная строка-табель сотрудника в общей таблице.
  const renderEmployeeRow = (empId: string, indent = false) => {
    const emp = orgEmployees.find((e) => e.id === empId);
    if (!emp) return null;
    const ts = findTs(empId);
    const sal = activeSalaryFor(initialSalaryHistory, empId, year, month);
    const baseRate = sal ? baseHourlyRateKop(sal) : 0;
    const isOpen = ts ? !!expandedTs[ts.id] : false;
    if (!ts) {
      return (
        <TableRow key={`empty-${empId}`} className={cn(indent && 'bg-muted/10')}>
          <TableCell className="p-2" />
          <TableCell className={cn('font-medium', indent && 'pl-8')}>{emp.name}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{emp.position}</TableCell>
          <TableCell colSpan={7} className="text-xs text-muted-foreground italic">
            Табель за выбранный период не создан
          </TableCell>
          <TableCell />
        </TableRow>
      );
    }
    const totH = totalHours(ts);
    const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
    const agg = aggregateBlock(ts.rows, sal);
    const role = roleForTs(ts);
    return (
      <>
        <TableRow
          key={ts.id}
          className={cn(isOpen && 'bg-muted/30 border-b-0', indent && !isOpen && 'bg-muted/10')}
        >
          <TableCell className="p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpandedTs((p) => ({ ...p, [ts.id]: !p[ts.id] }))}
              title={isOpen ? 'Свернуть' : 'Раскрыть табель'}
            >
              <span
                className={cn('inline-block transition-transform text-xs', isOpen && 'rotate-90')}
              >
                ▶
              </span>
            </Button>
          </TableCell>
          <TableCell className={cn('font-medium', indent && 'pl-8')}>{emp.name}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{emp.position}</TableCell>
          <TableCell>
            <StatusBadge status={ts.status} />
          </TableCell>
          <TableCell className="text-right font-mono text-xs num-tabular">
            <span
              className={cn(
                totH < STANDARD_MONTH_HOURS * 0.5 && 'text-amber-700',
                totH > STANDARD_MONTH_HOURS + 24 && 'text-rose-700',
              )}
            >
              {totH.toFixed(1)} ч
            </span>
          </TableCell>
          <TableCell className="text-right text-xs num-tabular">
            {baseRate > 0 ? `${formatRubInt(baseRate)}/ч` : '—'}
          </TableCell>
          <TableCell className="text-right text-[11px] num-tabular text-muted-foreground">
            {totalMin > 0 ? `${Math.round(agg.mgrPct * 100)}%` : '—'}
          </TableCell>
          <TableCell className="text-right text-[11px] num-tabular text-muted-foreground">
            {totalMin > 0 ? `${Math.round(agg.bizPct * 100)}%` : '—'}
          </TableCell>
          <TableCell className="text-right text-xs num-tabular font-medium">
            {formatRubInt(agg.netTotal)}
          </TableCell>
          <TableCell className="text-right text-xs num-tabular text-muted-foreground">
            {totalMin > 0 ? `${formatRubInt(agg.effRate)}/ч` : '—'}
          </TableCell>
          <TableCell>
            {ts.status === 'approved' && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Заблокирован
              </Badge>
            )}
          </TableCell>
        </TableRow>
        {isOpen && (
          <TableRow key={`${ts.id}-exp`} className="bg-muted/10">
            <TableCell colSpan={11} className="p-3">
              {ts.status === 'rejected' && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-800 flex items-start gap-2 mb-3">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">Табель отклонён</div>
                    <div className="text-xs">
                      {ts.history.filter((h) => h.toStatus === 'rejected').slice(-1)[0]?.comment ??
                        'Без комментария'}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
                {renderActions(ts, role)}
              </div>
              {renderRowsTable(ts, role)}
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  // Сортировка унифицированного списка табелей (по колонкам).
  type UnifiedSortKey =
    | 'name'
    | 'position'
    | 'status'
    | 'hours'
    | 'baseRate'
    | 'mgrPct'
    | 'bizPct'
    | 'netTotal'
    | 'effRate';
  const [unifiedSort, setUnifiedSort] = useState<{
    key: UnifiedSortKey;
    dir: SortDir;
  } | null>(null);
  const [unifiedStatusFilter, setUnifiedStatusFilter] = useState<TimesheetStatus | 'all'>('all');

  const cycleUnifiedSort = (key: UnifiedSortKey) => {
    setUnifiedSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  // Метрики строки сотрудника (для сортировки/фильтра).
  const employeeMetrics = (empId: string) => {
    const emp = orgEmployees.find((e) => e.id === empId);
    const ts = findTs(empId);
    const sal = activeSalaryFor(initialSalaryHistory, empId, year, month);
    const baseRate = sal ? baseHourlyRateKop(sal) : 0;
    if (!ts) {
      return {
        emp,
        ts: null as Timesheet | null,
        baseRate,
        totH: 0,
        totalMin: 0,
        agg: null as ReturnType<typeof aggregateBlock> | null,
      };
    }
    const totH = totalHours(ts);
    const totalMin = ts.rows.reduce((s, r) => s + r.minutes, 0);
    const agg = aggregateBlock(ts.rows, sal);
    return { emp, ts, baseRate, totH, totalMin, agg };
  };

  const passesStatusFilter = (empId: string) => {
    if (unifiedStatusFilter === 'all') return true;
    const ts = findTs(empId);
    if (!ts) return false;
    return ts.status === unifiedStatusFilter;
  };

  const sortIds = (ids: string[]): string[] => {
    if (!unifiedSort) return ids;
    const { key, dir } = unifiedSort;
    const arr = [...ids];
    arr.sort((a, b) => {
      const ma = employeeMetrics(a);
      const mb = employeeMetrics(b);
      const valOf = (m: ReturnType<typeof employeeMetrics>): number | string => {
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
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), 'ru');
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  };

  // Заголовок таблицы с сортировкой (без колонки "Действия" — действия скрыты внутри табеля).
  const UnifiedSortHead = ({
    label,
    sortKey,
    align = 'left',
    className,
    title,
  }: {
    label: string;
    sortKey: UnifiedSortKey;
    align?: 'left' | 'right';
    className?: string;
    title?: string;
  }) => {
    const active = unifiedSort?.key === sortKey;
    const Icon = !active ? ArrowUpDown : unifiedSort!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className} title={title}>
        <button
          type="button"
          onClick={() => cycleUnifiedSort(sortKey)}
          className={cn(
            'inline-flex items-center gap-1 select-none hover:text-foreground transition-colors w-full',
            align === 'right' ? 'justify-end' : 'justify-start',
            active ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span>{label}</span>
          <Icon className={cn('h-3 w-3 shrink-0', active ? 'opacity-100' : 'opacity-30')} />
        </button>
      </TableHead>
    );
  };

  const unifiedHeader = (
    <TableHeader>
      <TableRow className="bg-muted/40">
        <TableHead className="w-[36px]" />
        <UnifiedSortHead label="ФИО" sortKey="name" />
        <UnifiedSortHead label="Должность" sortKey="position" />
        <UnifiedSortHead label="Статус" sortKey="status" className="w-[180px]" />
        <UnifiedSortHead
          label="Часы"
          sortKey="hours"
          align="right"
          className="text-right w-[90px]"
        />
        <UnifiedSortHead
          label="Базовая ставка"
          sortKey="baseRate"
          align="right"
          className="text-right w-[120px]"
        />
        <UnifiedSortHead
          label="Ср. % рук."
          sortKey="mgrPct"
          align="right"
          className="text-right w-[100px]"
          title="Средневзвешенный % надбавки руководителя"
        />
        <UnifiedSortHead
          label="Ср. % бизн."
          sortKey="bizPct"
          align="right"
          className="text-right w-[100px]"
          title="Средневзвешенный % надбавки бизнеса"
        />
        <UnifiedSortHead
          label="ЗП на руки"
          sortKey="netTotal"
          align="right"
          className="text-right w-[120px]"
        />
        <UnifiedSortHead
          label="Эфф. ставка"
          sortKey="effRate"
          align="right"
          className="text-right w-[110px]"
          title="Итого на руки / часы"
        />
        <TableHead className="w-[140px]" />
      </TableRow>
    </TableHeader>
  );

  // Фильтр по статусам.
  const STATUS_FILTER_OPTIONS: { value: TimesheetStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Все статусы' },
    { value: 'draft', label: TIMESHEET_STATUS_LABEL_RU.draft },
    { value: 'submitted', label: TIMESHEET_STATUS_LABEL_RU.submitted },
    { value: 'manager_approved', label: TIMESHEET_STATUS_LABEL_RU.manager_approved },
    { value: 'approved', label: TIMESHEET_STATUS_LABEL_RU.approved },
    { value: 'rejected', label: TIMESHEET_STATUS_LABEL_RU.rejected },
  ];

  const statusFilterControl = (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Фильтр по статусу:</Label>
      <Select
        value={unifiedStatusFilter}
        onValueChange={(v) => setUnifiedStatusFilter(v as TimesheetStatus | 'all')}
      >
        <SelectTrigger className="h-8 w-[200px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Группа: руководитель + его подчинённые. Директор видит несколько таких групп.
  const renderManagerGroup = (managerId: string) => {
    const mgr = orgEmployees.find((e) => e.id === managerId);
    if (!mgr) return null;
    const subIds = orgEmployees.filter((e) => e.managerId === managerId).map((e) => e.id);
    // Применяем фильтр и сортировку отдельно к руководителю и его подчинённым.
    // Руководитель остаётся "шапкой" группы, если проходит фильтр; подчинённые сортируются.
    const mgrShown = passesStatusFilter(managerId);
    const subsShown = sortIds(subIds.filter(passesStatusFilter));
    if (!mgrShown && subsShown.length === 0) return null;
    return (
      <div key={managerId} className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-semibold text-primary">{mgr.name}</span>
          <span className="text-xs text-muted-foreground">
            · {mgr.position} · подчинённых: {subIds.length}
          </span>
        </div>
        <Table>
          {unifiedHeader}
          <TableBody>
            {mgrShown && renderEmployeeRow(managerId)}
            {subsShown.map((id) => renderEmployeeRow(id, true))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderUnified = () => {
    // Демо-переключатель текущего пользователя (вместо auth) + фильтр статуса.
    const controls = (
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Демо-вход:</span>
          <Select
            value={viewerId}
            onValueChange={(v) => {
              setViewerId(v);
              setExpandedTs({});
            }}
          >
            <SelectTrigger className="h-8 w-[280px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWER_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {statusFilterControl}
      </div>
    );

    if (isDirector) {
      // Директор: группы по непосредственным руководителям + его собственный табель сверху.
      const managerIds = Array.from(
        new Set(orgEmployees.filter((e) => e.managerId === viewerId).map((e) => e.id)),
      );
      const sortedManagerIds = sortIds(managerIds);
      return (
        <div className="space-y-4">
          {controls}
          {passesStatusFilter(viewerId) && (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border-b text-sm">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Мой табель (Директор)</span>
              </div>
              <Table>
                {unifiedHeader}
                <TableBody>{renderEmployeeRow(viewerId)}</TableBody>
              </Table>
            </div>
          )}
          {sortedManagerIds.map((mId) => renderManagerGroup(mId))}
        </div>
      );
    }

    if (isManager) {
      // Руководитель: своя строка + строки прямых/косвенных подчинённых одной таблицей.
      const subIds = subordinates.map((s) => s.id);
      const sortedSubs = sortIds(subIds.filter(passesStatusFilter));
      const meShown = passesStatusFilter(viewerId);
      return (
        <div className="space-y-4">
          {controls}
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              {unifiedHeader}
              <TableBody>
                {meShown && renderEmployeeRow(viewerId)}
                {sortedSubs.map((id) => renderEmployeeRow(id, true))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    // Сотрудник без подчинённых — только своя строка.
    return (
      <div className="space-y-4">
        {controls}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            {unifiedHeader}
            <TableBody>{renderEmployeeRow(viewerId)}</TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const rejectTs = rejectDialog ? timesheets.find((t) => t.id === rejectDialog.tsId) : null;
  const addRowTs = addRowDialog ? timesheets.find((t) => t.id === addRowDialog.tsId) : null;
  const historyTs = historyDialog ? timesheets.find((t) => t.id === historyDialog.tsId) : null;

  // Доступные для добавления задачи: всё из бэклога, кроме уже присутствующих в табеле.
  const addableIssues = useMemo(() => {
    if (!addRowTs) return [];
    const used = new Set(addRowTs.rows.map((r) => r.issueIdReadable));
    return backlogItems.filter((b) => !used.has(b.idReadable));
  }, [addRowTs]);

  return (
    <AppLayout>
      <TooltipProvider delayDuration={150}>
        <PageHeader
          title="Табели рабочего времени"
          description="Месячный ввод часов по задачам, согласование по маршруту Сотрудник → Руководитель → Директор"
          breadcrumbs={[{ label: 'Главная' }, { label: 'Табели' }]}
          actions={
            <div className="flex items-center gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_RU.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="p-6 space-y-4">{renderUnified()}</div>

        {/* Reject dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Отклонить табель</DialogTitle>
              <DialogDescription>
                Сотрудник получит уведомление с указанным комментарием и сможет скорректировать
                данные.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Комментарий (обязательно)</Label>
              <Textarea
                id="reject-comment"
                rows={4}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Например: уточните распределение часов между ERP-201 и ERP-204"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                disabled={rejectComment.trim().length < 3}
                onClick={() => {
                  if (rejectTs) reject(rejectTs, rejectComment.trim());
                  setRejectDialog(null);
                }}
              >
                Отклонить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add row dialog */}
        <Dialog open={!!addRowDialog} onOpenChange={(o) => !o && setAddRowDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить задачу из YouTrack</DialogTitle>
              <DialogDescription>
                Задача будет отмечена как «Вне плана» — учитывается в фактических часах, но не
                входила в план месяца.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Задача</Label>
              <Select value={addIssueId} onValueChange={setAddIssueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите задачу..." />
                </SelectTrigger>
                <SelectContent>
                  {addableIssues.map((b) => (
                    <SelectItem key={b.idReadable} value={b.idReadable}>
                      <span className="font-mono text-xs mr-2">{b.idReadable}</span>
                      <span className="text-xs">{b.summary}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddRowDialog(null)}>
                Отмена
              </Button>
              <Button
                disabled={!addIssueId}
                onClick={() => {
                  if (addRowTs && addIssueId) addRow(addRowTs, addIssueId);
                  setAddIssueId('');
                  setAddRowDialog(null);
                }}
              >
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History dialog */}
        <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>История табеля</DialogTitle>
              <DialogDescription>
                Аудит переходов статусов и изменений строк (часы, оценки) с автором и временем.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="status">
              <TabsList>
                <TabsTrigger value="status">
                  Согласование ({historyTs?.history.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="rows">
                  Изменения строк ({historyTs?.rowChanges.length ?? 0})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="status" className="space-y-2 max-h-[400px] overflow-auto mt-3">
                {historyTs?.history.map((h, i) => {
                  const actor = orgEmployees.find((e) => e.id === h.actorId);
                  return (
                    <div key={i} className="border border-border rounded-md p-2 text-xs space-y-1">
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
                    </div>
                  );
                })}
              </TabsContent>
              <TabsContent value="rows" className="space-y-2 max-h-[400px] overflow-auto mt-3">
                {historyTs?.rowChanges.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6">
                    Изменений по строкам ещё не было.
                  </div>
                )}
                {historyTs?.rowChanges
                  .slice()
                  .reverse()
                  .map((c, i) => {
                    const actor = orgEmployees.find((e) => e.id === c.actorId);
                    const row = historyTs.rows.find((r) => r.id === c.rowId);
                    const fieldLabel: Record<typeof c.field, string> = {
                      minutes: 'Часы',
                      managerGrade: 'Оценка руководителя',
                      businessGrade: 'Оценка бизнеса',
                    };
                    return (
                      <div
                        key={i}
                        className="border border-border rounded-md p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            <span className="font-mono mr-1">
                              {row?.issueIdReadable ?? c.rowId}
                            </span>
                            · {fieldLabel[c.field]}
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
                        <div className="text-muted-foreground">
                          Автор: {actor?.name ?? c.actorId}
                        </div>
                      </div>
                    );
                  })}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryDialog(null)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Timesheets;
