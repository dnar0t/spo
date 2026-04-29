import { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Download,
  ExternalLink,
  Filter,
  Lock,
  Settings as SettingsIcon,
  Users,
  Zap,
  Loader2,
} from 'lucide-react';
import {
  effectiveEstimate,
  effectiveSpent,
  remainingEstimate,
  getSubtasks,
  isSubtaskOf,
  availableCapacity,
  DEFAULT_SPRINT_SETTINGS,
  directionPlannedHours,
  employeeColumnHours,
  hoursPerIssueForRole,
  loadZone,
  MONTHS_RU,
  totalRoleHours,
  type SprintSettings,
} from '@/lib/planning';
import {
  MultiSelectFilter,
  SearchFilter,
  SingleSelectFilter,
} from '@/components/planning/MultiSelectFilter';
import { usePlanning, type BacklogItemDto } from '@/hooks/usePlanning';
import type {
  Assignment,
  BacklogIssue,
  IssueState,
  IssueType,
  Priority,
  WorkRole,
} from '@/data/planningMock';

// ============================================================================
// Константы
// ============================================================================

const PLANNABLE_ROLES: WorkRole[] = ['development', 'testing', 'management'];

/** Маппинг состояний периода на русский */
const PERIOD_STATE_LABEL_RU: Record<string, string> = {
  PLANNING: 'Планирование',
  PLAN_FIXED: 'План зафиксирован',
  FACT_LOADING: 'Загрузка факта',
  EVALUATION: 'Оценка',
  CLOSED: 'Закрыт',
  PERIOD_REOPENED: 'Переоткрыт',
};

const ISSUE_STATES: IssueState[] = [
  'Open',
  'In Progress',
  'In Review',
  'Testing',
  'Done',
  'Reopened',
];
const ISSUE_TYPES: IssueType[] = ['Epic', 'Feature', 'Story', 'Task', 'Bug'];
const PRIORITIES: Priority[] = ['Blocker', 'High', 'Medium', 'Low'];

const TYPE_LABEL_RU: Record<IssueType, string> = {
  Epic: 'Эпик',
  Feature: 'Функция',
  Story: 'История',
  Task: 'Задача',
  Bug: 'Баг',
};
const PRIORITY_LABEL_RU: Record<Priority, string> = {
  Blocker: 'Блокер',
  High: 'Высокий',
  Medium: 'Средний',
  Low: 'Низкий',
};
const STATE_LABEL_RU: Record<IssueState, string> = {
  Open: 'Открыта',
  'In Progress': 'В работе',
  'In Review': 'На ревью',
  Testing: 'Тестирование',
  Done: 'Готово',
  Reopened: 'Переоткрыта',
};
const WORK_ROLE_LABEL_RU: Record<WorkRole, string> = {
  development: 'Разработка',
  testing: 'Тестирование',
  management: 'Управление',
  other: 'Другое',
};

/** Базовый URL YouTrack для построения ссылок */
const YT_BASE_URL = 'https://youtrack.company.local';
function ytIssueUrl(idReadable: string): string {
  return `${YT_BASE_URL}/issue/${idReadable}`;
}

// ============================================================================
// Интерфейс истории
// ============================================================================

interface PlanHistoryEntry {
  id: string;
  at: Date;
  action: 'lock' | 'unlock';
  sprint: string;
  tasks: number;
  hours: number;
  user: string;
}

// ============================================================================
// Конвертер DTO → BacklogIssue
// ============================================================================

function convertBacklogDto(items: BacklogItemDto[]): BacklogIssue[] {
  const result: BacklogIssue[] = [];
  function walk(list: BacklogItemDto[], parentNumber?: string | null) {
    for (const item of list) {
      result.push({
        id: item.id,
        idReadable: item.issueNumber,
        summary: item.summary,
        projectId: '',
        systemId: '',
        type: 'Task' as IssueType,
        priority: 'Medium' as Priority,
        state: 'Open' as IssueState,
        reporterId: '',
        estimateHours: item.totalPlannedHours,
        readiness: item.readinessPercent,
        spentHours: 0,
        parentIdReadable: item.parentIssueNumber ?? parentNumber ?? undefined,
        parentSummary: undefined,
        parentType: undefined,
        assigneeId: item.assigneeId ?? undefined,
      });
      if (item.children?.length) walk(item.children, item.issueNumber);
    }
  }
  walk(items);
  return result;
}

// ============================================================================
// Экспортируемые утилиты (для usePlanning и тестов)
// ============================================================================

export function flattenBacklogItems(
  items: BacklogItemDto[],
  parentIssueNumber?: string | null,
): BacklogIssue[] {
  return convertBacklogDto(items);
}

// ============================================================================
// Компонент
// ============================================================================

const Planning = () => {
  const { toast } = useToast();
  const {
    usePeriods,
    usePeriodDetail,
    useBacklog,
    useCapacity,
    useAssignTask,
    useUnassignTask,
    useFixPlan,
    useUpdatePeriod,
    usePlanVersions,
    useTransitionPeriod,
  } = usePlanning();

  // ---- Период ----
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const periodsQuery = usePeriods();
  const periods = periodsQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const periodDetailQuery = usePeriodDetail(selectedPeriodId);
  const currentPeriod = periodDetailQuery.data;

  // ---- Настройки ----
  const [settings, setSettings] = useState<SprintSettings>(DEFAULT_SPRINT_SETTINGS);
  useEffect(() => {
    if (currentPeriod) {
      setSettings({
        year: currentPeriod.year,
        month: currentPeriod.month,
        workHoursPerMonth:
          currentPeriod.workHoursPerMonth ?? DEFAULT_SPRINT_SETTINGS.workHoursPerMonth,
        reservePercent: currentPeriod.reservePercent ?? DEFAULT_SPRINT_SETTINGS.reservePercent,
        debugPercent: currentPeriod.debugPercent ?? DEFAULT_SPRINT_SETTINGS.debugPercent,
        testingPercent: currentPeriod.testPercent ?? DEFAULT_SPRINT_SETTINGS.testingPercent,
        managementPercent: currentPeriod.mgmtPercent ?? DEFAULT_SPRINT_SETTINGS.managementPercent,
        yellowThreshold: currentPeriod.yellowThreshold ?? DEFAULT_SPRINT_SETTINGS.yellowThreshold,
        redThreshold: currentPeriod.redThreshold ?? DEFAULT_SPRINT_SETTINGS.redThreshold,
        workHoursPerYear: DEFAULT_SPRINT_SETTINGS.workHoursPerYear,
      });
    }
  }, [currentPeriod]);

  const planLocked = currentPeriod?.state === 'PLAN_FIXED' || currentPeriod?.state === 'CLOSED';

  // ---- Фильтры ----
  const [search, setSearch] = useState('');
  const [systemIds, setSystemIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [priorityIds, setPriorityIds] = useState<string[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [stateIds, setStateIds] = useState<string[]>([]);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [plannedF, setPlannedF] = useState<'all' | 'planned' | 'not_planned'>('all');
  const [readinessF, setReadinessF] = useState<'all' | 'new' | 'in_progress' | 'near_done'>('all');

  // ---- Бэклог ----
  const backlogQuery = useBacklog(selectedPeriodId, {
    search: search || undefined,
    isPlanned: plannedF === 'all' ? undefined : plannedF === 'planned' ? 'true' : 'false',
    page: 1,
    limit: 200,
  });

  const apiBacklog = useMemo(
    () => (backlogQuery.data?.data ? convertBacklogDto(backlogQuery.data.data) : []),
    [backlogQuery.data],
  );

  // ---- Capacity ----
  const capacityQuery = useCapacity(selectedPeriodId);
  const capacityData = capacityQuery.data;

  const allEmployees = useMemo(() => {
    if (!capacityData) return [];
    return capacityData.employees.map((e) => ({
      id: e.employeeId,
      name: e.fullName ?? 'Неизвестный',
      position: 'Сотрудник',
      workRole: 'development' as WorkRole,
      monthlyNetSalary: 0,
      ytLogin: '',
    }));
  }, [capacityData]);

  const allDevelopers = useMemo(() => allEmployees.filter(() => true), [allEmployees]);
  const allTesters = useMemo<typeof allDevelopers>(() => [], []);
  const allManagers = useMemo<typeof allDevelopers>(() => [], []);

  // ---- Назначения ----
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (backlogQuery.data?.data) {
      const newAssignments: Assignment[] = [];
      function walkChildren(items: BacklogItemDto[]) {
        for (const item of items) {
          if (item.isPlanned && item.assigneeId) {
            newAssignments.push({
              issueId: item.id,
              employeeId: item.assigneeId,
              role: 'development' as WorkRole,
            });
          }
          if (item.children?.length) walkChildren(item.children);
        }
      }
      walkChildren(backlogQuery.data.data);
      setAssignments(newAssignments);
    }
  }, [backlogQuery.data]);

  // ---- Мутации ----
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();
  const fixPlanMutation = useFixPlan();
  const updatePeriodMutation = useUpdatePeriod();
  const transitionMutation = useTransitionPeriod();

  // ---- Версии плана (история) ----
  const planVersionsQuery = usePlanVersions(selectedPeriodId);
  const planVersions = planVersionsQuery.data ?? [];

  // ---- UI состояние ----
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<PlanHistoryEntry[]>([]);

  // ---- Фильтрация клиентская ----
  const filteredBacklog = useMemo(() => {
    const matches = (i: BacklogIssue) => {
      if (systemIds.length && !systemIds.includes(i.systemId)) return false;
      if (projectIds.length && !projectIds.includes(i.projectId)) return false;
      if (priorityIds.length && !priorityIds.includes(i.priority)) return false;
      if (typeIds.length && !typeIds.includes(i.type)) return false;
      if (stateIds.length && !stateIds.includes(i.state)) return false;
      if (employeeIds.length && i.assigneeId && !employeeIds.includes(i.assigneeId)) return false;
      if (readinessF === 'new' && i.readiness !== 0) return false;
      if (readinessF === 'in_progress' && (i.readiness === 0 || i.readiness >= 80)) return false;
      if (readinessF === 'near_done' && i.readiness < 80) return false;
      return true;
    };
    const passSet = new Set(apiBacklog.filter(matches).map((i) => i.id));
    for (const i of apiBacklog) {
      if (passSet.has(i.id) && i.parentIdReadable) {
        const parent = apiBacklog.find((p) => p.idReadable === i.parentIdReadable);
        if (parent) passSet.add(parent.id);
      }
    }
    for (const i of apiBacklog) {
      if (passSet.has(i.id)) {
        for (const child of apiBacklog) {
          if (child.parentIdReadable === i.idReadable) passSet.add(child.id);
        }
      }
    }
    return apiBacklog.filter((i) => passSet.has(i.id));
  }, [apiBacklog, systemIds, projectIds, priorityIds, typeIds, stateIds, employeeIds, readinessF]);

  const filtersActive =
    !!search ||
    systemIds.length > 0 ||
    projectIds.length > 0 ||
    priorityIds.length > 0 ||
    typeIds.length > 0 ||
    stateIds.length > 0 ||
    employeeIds.length > 0 ||
    roleIds.length > 0 ||
    plannedF !== 'all' ||
    readinessF !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSystemIds([]);
    setProjectIds([]);
    setPriorityIds([]);
    setTypeIds([]);
    setStateIds([]);
    setEmployeeIds([]);
    setRoleIds([]);
    setPlannedF('all');
    setReadinessF('all');
  };

  // ---- DnD ----
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const isRoleVisible = (r: WorkRole) => roleIds.length === 0 || roleIds.includes(r);
  const showDevColumns = isRoleVisible('development');
  const showTesting = isRoleVisible('testing');
  const showManagement = isRoleVisible('management');

  const developers = useMemo(() => {
    if (!showDevColumns) return [];
    if (employeeIds.length === 0) return allDevelopers;
    return allDevelopers.filter((d) => employeeIds.includes(d.id));
  }, [allDevelopers, employeeIds, showDevColumns]);

  const testers = useMemo(() => {
    if (!showTesting) return [];
    if (employeeIds.length === 0) return allTesters;
    return allTesters.filter((d) => employeeIds.includes(d.id));
  }, [allTesters, employeeIds, showTesting]);

  const managers = useMemo(() => {
    if (!showManagement) return [];
    if (employeeIds.length === 0) return allManagers;
    return allManagers.filter((d) => employeeIds.includes(d.id));
  }, [allManagers, employeeIds, showManagement]);

  const assignmentByIssueRole = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) m.set(`${a.issueId}|${a.role}`, a.employeeId);
    return m;
  }, [assignments]);

  const issueIsPlanned = (issueId: string) => assignments.some((a) => a.issueId === issueId);

  // ---- KPI ----
  const capacity = availableCapacity(settings);
  const totalDev = totalRoleHours('development', assignments, apiBacklog, settings);
  const totalTesting = totalRoleHours('testing', assignments, apiBacklog, settings);
  const totalManagement = totalRoleHours('management', assignments, apiBacklog, settings);

  const overloadedDevs = allDevelopers.filter((d) => {
    const h = employeeColumnHours(d.id, 'development', assignments, apiBacklog, settings);
    return h > capacity;
  }).length;

  const plannedIssueCount = new Set(assignments.map((a) => a.issueId)).size;
  const totalAvailable = allDevelopers.length * capacity;
  const utilization = totalAvailable > 0 ? Math.round((totalDev / totalAvailable) * 100) : 0;

  // ---- DnD handlers ----
  const onDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    if (planLocked || !selectedPeriodId) return;
    const issueId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || !overId.startsWith('emp:')) return;
    const [, roleStr, employeeId] = overId.split(':');
    const role = roleStr as WorkRole;

    const issue = apiBacklog.find((i) => i.id === issueId);
    if (!issue) return;
    const remaining = remainingEstimate(issue, apiBacklog);

    setAssignments((prev) => {
      const next = prev.filter((a) => !(a.issueId === issueId && a.role === role));
      next.push({ issueId, employeeId, role });
      return next;
    });

    assignTaskMutation.mutate({
      periodId: selectedPeriodId,
      taskId: issueId,
      employeeId,
      plannedHours: remaining,
    });
  };

  const toggleAssign = (issueId: string, employeeId: string, role: WorkRole, checked: boolean) => {
    if (planLocked || !selectedPeriodId) return;
    setAssignments((prev) => {
      const filtered = prev.filter((a) => !(a.issueId === issueId && a.role === role));
      return checked ? [...filtered, { issueId, employeeId, role }] : filtered;
    });

    if (checked) {
      const issue = apiBacklog.find((i) => i.id === issueId);
      const remaining = issue ? remainingEstimate(issue, apiBacklog) : 0;
      assignTaskMutation.mutate({
        periodId: selectedPeriodId,
        taskId: issueId,
        employeeId,
        plannedHours: remaining,
      });
    } else {
      unassignTaskMutation.mutate({ periodId: selectedPeriodId, taskId: issueId });
    }
  };

  const removeAssignment = (issueId: string, role?: WorkRole) => {
    if (planLocked || !selectedPeriodId) return;
    setAssignments((prev) =>
      prev.filter((a) =>
        role ? !(a.issueId === issueId && a.role === role) : a.issueId !== issueId,
      ),
    );
    unassignTaskMutation.mutate({ periodId: selectedPeriodId, taskId: issueId });
  };

  const fixPlan = () => {
    if (!selectedPeriodId) return;
    fixPlanMutation.mutate(
      { periodId: selectedPeriodId },
      {
        onSuccess: (data) => {
          const sprint = `${MONTHS_RU[settings.month - 1]} ${settings.year}`;
          setHistory((prev) => [
            {
              id: `${Date.now()}`,
              at: new Date(),
              action: 'lock',
              sprint,
              tasks: data.taskCount,
              hours: data.totalPlannedHours,
              user: 'Текущий пользователь',
            },
            ...prev,
          ]);
        },
      },
    );
  };

  const unlockPlan = () => {
    if (!selectedPeriodId) return;
    transitionMutation.mutate(
      { periodId: selectedPeriodId, transition: 'REOPEN' },
      {
        onSuccess: () => {
          const sprint = `${MONTHS_RU[settings.month - 1]} ${settings.year}`;
          setHistory((prev) => [
            {
              id: `${Date.now()}`,
              at: new Date(),
              action: 'unlock',
              sprint,
              tasks: plannedIssueCount,
              hours: totalDev,
              user: 'Текущий пользователь',
            },
            ...prev,
          ]);
        },
      },
    );
  };

  const activeIssue = activeDragId ? apiBacklog.find((i) => i.id === activeDragId) : null;

  // ---- Загрузка / Ошибка ----
  const isLoading = periodsQuery.isLoading || backlogQuery.isLoading || capacityQuery.isLoading;
  const isError = periodsQuery.isError || backlogQuery.isError || capacityQuery.isError;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Загрузка данных планирования...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">
              Ошибка загрузки данных. Попробуйте перезагрузить страницу.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Перезагрузить
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ---- Фильтр опции ----
  const filterProjects = useMemo(() => {
    const seen = new Set<string>();
    const arr: { id: string; shortName: string; name: string }[] = [];
    for (const i of apiBacklog) {
      if (i.projectId && !seen.has(i.projectId)) {
        seen.add(i.projectId);
        arr.push({ id: i.projectId, shortName: i.projectId, name: i.projectId });
      }
    }
    return arr;
  }, [apiBacklog]);

  const filterSystems = useMemo(() => {
    const seen = new Set<string>();
    const arr: { id: string; name: string }[] = [];
    for (const i of apiBacklog) {
      if (i.systemId && !seen.has(i.systemId)) {
        seen.add(i.systemId);
        arr.push({ id: i.systemId, name: i.systemId });
      }
    }
    return arr;
  }, [apiBacklog]);

  const directionColCount = (showTesting ? 1 : 0) + (showManagement ? 1 : 0);

  return (
    <AppLayout>
      <PageHeader
        title={`Планирование · спринт ${MONTHS_RU[settings.month - 1]} ${settings.year}`}
        description={
          currentPeriod
            ? `Статус: ${PERIOD_STATE_LABEL_RU[currentPeriod.state] ?? currentPeriod.state} · Распределение задач бэклога YouTrack на месячный спринт.`
            : 'Выберите период для планирования'
        }
        breadcrumbs={[{ label: 'Главная' }, { label: 'Планирование' }]}
        actions={
          <>
            {/* Селектор периода */}
            <Select value={selectedPeriodId ?? ''} onValueChange={(v) => setSelectedPeriodId(v)}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {MONTHS_RU[p.month - 1]} {p.year} · {PERIOD_STATE_LABEL_RU[p.state] ?? p.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <SettingsIcon className="h-4 w-4" />
                  Настройки спринта
                </Button>
              </DialogTrigger>
              <SprintSettingsDialog
                value={settings}
                onSave={(s) => {
                  setSettings(s);
                  setSettingsOpen(false);
                  if (selectedPeriodId) {
                    updatePeriodMutation.mutate({
                      periodId: selectedPeriodId,
                      workHoursPerMonth: s.workHoursPerMonth,
                      reservePercent: s.reservePercent,
                      testPercent: s.testingPercent,
                      debugPercent: s.debugPercent,
                      mgmtPercent: s.managementPercent,
                      yellowThreshold: s.yellowThreshold,
                      redThreshold: s.redThreshold,
                    });
                  }
                }}
              />
            </Dialog>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Экспорт
            </Button>
            {planLocked ? (
              <Button size="sm" variant="outline" onClick={unlockPlan}>
                <Lock className="h-4 w-4" />
                План зафиксирован
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary-hover"
                onClick={fixPlan}
                disabled={plannedIssueCount === 0 || !selectedPeriodId}
              >
                <CheckCircle2 className="h-4 w-4" />
                Зафиксировать план
              </Button>
            )}
          </>
        }
      />

      <div className="p-4 space-y-3">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KpiCard
            label="Доступная мощность"
            value={String(capacity)}
            unit={`ч / сотр · резерв ${Math.round(settings.reservePercent * 100)}%`}
            icon={Zap}
            accent="primary"
          />
          <KpiCard
            label="Запланировано задач"
            value={String(plannedIssueCount)}
            unit={`из ${apiBacklog.length}`}
            icon={Briefcase}
            accent="info"
          />
          <KpiCard
            label="Загрузка разработки"
            value={`${utilization}`}
            unit={`% · ${totalDev} ч назначено`}
            icon={Users}
            accent={
              utilization >= settings.redThreshold * 100
                ? 'warning'
                : utilization >= settings.yellowThreshold * 100
                  ? 'warning'
                  : 'success'
            }
          />
          <KpiCard
            label="Перегружены"
            value={String(overloadedDevs)}
            unit="разработчиков"
            icon={AlertTriangle}
            accent={overloadedDevs > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Фильтры */}
        <div className="bg-card border border-border rounded-md shadow-card">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Фильтры</span>
              {filtersActive && (
                <Badge
                  variant="secondary"
                  className="bg-primary-soft text-primary text-[10px] py-0 h-4 px-1.5"
                >
                  активны
                </Badge>
              )}
              <span className="text-muted-foreground ml-2">
                {filteredBacklog.length} / {apiBacklog.length} задач · столбцов: {developers.length}
              </span>
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetFilters}>
                Сбросить все
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 p-2">
            <SearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Поиск по № / названию"
              className="md:col-span-2"
            />
            <MultiSelectFilter
              value={projectIds}
              onChange={setProjectIds}
              placeholder="Проекты"
              options={filterProjects.map((p) => ({
                value: p.id,
                label: p.name,
                hint: p.shortName,
              }))}
            />
            <MultiSelectFilter
              value={systemIds}
              onChange={setSystemIds}
              placeholder="Системы"
              options={filterSystems.map((s) => ({ value: s.id, label: s.name }))}
            />
            <MultiSelectFilter
              value={priorityIds}
              onChange={setPriorityIds}
              placeholder="Приоритет"
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL_RU[p] }))}
            />
            <MultiSelectFilter
              value={typeIds}
              onChange={setTypeIds}
              placeholder="Тип"
              options={ISSUE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL_RU[t] }))}
            />
            <MultiSelectFilter
              value={stateIds}
              onChange={setStateIds}
              placeholder="Статус"
              options={ISSUE_STATES.map((s) => ({ value: s, label: STATE_LABEL_RU[s] }))}
            />
            <MultiSelectFilter
              value={roleIds}
              onChange={setRoleIds}
              placeholder="Роли"
              options={PLANNABLE_ROLES.map((r) => ({ value: r, label: WORK_ROLE_LABEL_RU[r] }))}
            />
            <MultiSelectFilter
              value={employeeIds}
              onChange={setEmployeeIds}
              placeholder="Сотрудники"
              options={allDevelopers.map((e) => ({ value: e.id, label: e.name, hint: e.position }))}
            />
            <SingleSelectFilter
              value={plannedF}
              defaultValue="all"
              onChange={(v) => setPlannedF(v as typeof plannedF)}
              placeholder="План"
              options={[
                { value: 'all', label: 'План: все' },
                { value: 'planned', label: 'Запланированы' },
                { value: 'not_planned', label: 'Не запланированы' },
              ]}
            />
            <SingleSelectFilter
              value={readinessF}
              defaultValue="all"
              onChange={(v) => setReadinessF(v as typeof readinessF)}
              placeholder="Готовность"
              options={[
                { value: 'all', label: 'Готовность: любая' },
                { value: 'new', label: 'Новые (0%)' },
                { value: 'in_progress', label: 'В работе (1–79%)' },
                { value: 'near_done', label: 'Почти готовы (80%+)' },
              ]}
            />
          </div>
        </div>

        {/* Основная таблица */}
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <TooltipProvider delayDuration={200}>
            <div className="bg-card border border-border rounded-md shadow-card overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold text-foreground">
                    Доска планирования спринта
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Слева — бэклог YouTrack. Колонки разделены на разработку, тестирование и
                    управление — задачу можно назначить по одному человеку на каждое направление.
                  </p>
                </div>
                <Legend settings={settings} />
              </div>

              <div className="overflow-auto max-h-[calc(100vh-340px)]">
                {(() => {
                  const BACKLOG_W = 432;
                  const EMP_W = 110;
                  const SUM_W = 130;
                  const allCols = [
                    ...developers.map((e) => ({ emp: e, role: 'development' as WorkRole })),
                    ...testers.map((e) => ({ emp: e, role: 'testing' as WorkRole })),
                    ...managers.map((e) => ({ emp: e, role: 'management' as WorkRole })),
                  ];
                  const tableMinWidth = BACKLOG_W + allCols.length * EMP_W + 2 * SUM_W;
                  return (
                    <table
                      className="text-xs border-separate border-spacing-0"
                      style={{
                        tableLayout: 'fixed',
                        width: tableMinWidth,
                        minWidth: tableMinWidth,
                      }}
                    >
                      <colgroup>
                        <col style={{ width: BACKLOG_W }} />
                        {developers.map((d) => (
                          <col key={`c-d-${d.id}`} style={{ width: EMP_W }} />
                        ))}
                        {testers.map((d) => (
                          <col key={`c-t-${d.id}`} style={{ width: EMP_W }} />
                        ))}
                        {managers.map((d) => (
                          <col key={`c-m-${d.id}`} style={{ width: EMP_W }} />
                        ))}
                        <col style={{ width: SUM_W }} />
                        <col style={{ width: SUM_W }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="sticky left-0 top-0 z-30 bg-muted px-3 py-1 text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground border-b border-r border-border">
                            Направление →
                          </th>
                          {developers.length > 0 && (
                            <th
                              colSpan={developers.length}
                              className="sticky top-0 z-20 bg-card border-b border-r border-border px-2 py-1 text-[10px] uppercase tracking-wide font-semibold text-primary text-left"
                            >
                              Разработка · {developers.length}
                            </th>
                          )}
                          {testers.length > 0 && (
                            <th
                              colSpan={testers.length}
                              className="sticky top-0 z-20 bg-card border-b border-r border-border px-2 py-1 text-[10px] uppercase tracking-wide font-semibold text-info text-left"
                            >
                              Тестирование · {testers.length}
                            </th>
                          )}
                          {managers.length > 0 && (
                            <th
                              colSpan={managers.length}
                              className="sticky top-0 z-20 bg-card border-b border-r border-border px-2 py-1 text-[10px] uppercase tracking-wide font-semibold text-warning text-left"
                            >
                              Управление · {managers.length}
                            </th>
                          )}
                          <th
                            colSpan={2}
                            className="sticky top-0 z-20 bg-card border-b border-border px-2 py-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground text-left"
                          >
                            План направления
                          </th>
                        </tr>
                        <tr>
                          <th className="sticky left-0 top-[26px] z-30 bg-muted text-left font-medium text-muted-foreground px-3 py-2 border-b border-r border-border">
                            Бэклог · {filteredBacklog.length} задач
                          </th>
                          {allCols.map(({ emp, role }) => {
                            const h = employeeColumnHours(
                              emp.id,
                              role,
                              assignments,
                              apiBacklog,
                              settings,
                            );
                            const zone = loadZone(h, capacity, settings);
                            const pct = capacity > 0 ? Math.round((h / capacity) * 100) : 0;
                            return (
                              <th
                                key={`${role}-${emp.id}`}
                                className="sticky top-[26px] z-20 p-0 border-b border-border align-top bg-card"
                              >
                                <div
                                  className={cn(
                                    'px-1.5 py-1 h-full whitespace-nowrap',
                                    zoneHeaderBg(zone),
                                  )}
                                >
                                  <div className="text-foreground font-semibold leading-tight text-[11px] truncate">
                                    {emp.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {emp.position}
                                  </div>
                                  <div className="mt-0.5 flex items-baseline justify-end gap-1">
                                    <span className="text-[10px] num-tabular text-muted-foreground leading-none">
                                      {h} ч
                                    </span>
                                    <span
                                      className={cn(
                                        'text-xs font-bold num-tabular leading-none',
                                        zoneTextClass(zone),
                                      )}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                          <th className="sticky top-[26px] z-20 bg-card border-b border-l border-border px-2 py-1 align-top">
                            <div className="text-[10px] uppercase tracking-wide font-semibold text-info leading-tight">
                              Тестирование
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {Math.round(settings.testingPercent * 100)}% от оценки
                            </div>
                          </th>
                          <th className="sticky top-[26px] z-20 bg-card border-b border-l border-border px-2 py-1 align-top">
                            <div className="text-[10px] uppercase tracking-wide font-semibold text-warning leading-tight">
                              Управление
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {Math.round((1 + settings.debugPercent) * 100)}% от оценки
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBacklog.length === 0 && (
                          <tr>
                            <td
                              colSpan={developers.length + testers.length + managers.length + 3}
                              className="text-center text-xs text-muted-foreground py-8"
                            >
                              Нет задач по выбранным фильтрам
                            </td>
                          </tr>
                        )}
                        {filteredBacklog.map((issue) => {
                          const planned = issueIsPlanned(issue.id);
                          const parentInList = isSubtaskOf(issue, apiBacklog);
                          const isSubtask = !!parentInList;
                          const eff = effectiveEstimate(issue, apiBacklog);
                          const spent = effectiveSpent(issue, apiBacklog);
                          const remaining = remainingEstimate(issue, apiBacklog);
                          const hasChildren =
                            issue.type === 'Story' &&
                            getSubtasks(issue.idReadable, apiBacklog).length > 0;
                          const rowTestH = hoursPerIssueForRole('testing', remaining, settings);
                          const rowMgmtH = hoursPerIssueForRole('management', remaining, settings);
                          return (
                            <tr key={issue.id} className="hover:bg-muted/30">
                              <td
                                className={cn(
                                  'sticky left-0 z-10 bg-card hover:bg-muted/30 px-2 py-1.5 border-b border-r border-border align-top',
                                  isSubtask && 'pl-6',
                                )}
                              >
                                <BacklogCard
                                  issue={issue}
                                  planned={planned}
                                  disabled={planLocked}
                                  effectiveEstimateValue={eff}
                                  spentValue={spent}
                                  remainingValue={remaining}
                                  isSubtask={isSubtask}
                                  hasChildren={hasChildren}
                                />
                              </td>
                              {allCols.map(({ emp, role }) => {
                                const isAssigned =
                                  assignmentByIssueRole.get(`${issue.id}|${role}`) === emp.id;
                                const cellH = hoursPerIssueForRole(role, remaining, settings);
                                return (
                                  <EmployeeCell
                                    key={`${role}-${emp.id}`}
                                    employeeId={emp.id}
                                    role={role}
                                    accept
                                    isHighlighted={!!activeDragId}
                                  >
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                      <Checkbox
                                        checked={isAssigned}
                                        onCheckedChange={(c) =>
                                          toggleAssign(issue.id, emp.id, role, c === true)
                                        }
                                        disabled={planLocked || remaining <= 0}
                                      />
                                      {isAssigned && (
                                        <span className="text-[11px] num-tabular text-foreground font-medium">
                                          {cellH} ч
                                        </span>
                                      )}
                                    </label>
                                  </EmployeeCell>
                                );
                              })}
                              <td className="px-2 py-1.5 border-b border-l border-border align-middle text-right num-tabular text-info text-[11px] font-medium bg-info/5">
                                {planned ? `${rowTestH} ч` : ''}
                              </td>
                              <td className="px-2 py-1.5 border-b border-l border-border align-middle text-right num-tabular text-warning text-[11px] font-medium bg-warning/5">
                                {planned ? `${rowMgmtH} ч` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted">
                          <td className="sticky left-0 z-10 bg-muted px-2 py-1.5 font-medium text-foreground text-xs border-r border-t border-border">
                            Итого по столбцам
                          </td>
                          {allCols.map(({ emp, role }) => {
                            const h = employeeColumnHours(
                              emp.id,
                              role,
                              assignments,
                              apiBacklog,
                              settings,
                            );
                            const zone = loadZone(h, capacity, settings);
                            const pct = capacity > 0 ? Math.round((h / capacity) * 100) : 0;
                            return (
                              <td
                                key={`${role}-${emp.id}`}
                                className={cn(
                                  'px-2 py-1.5 num-tabular font-semibold text-xs bg-muted border-t border-border',
                                  zoneTextClass(zone),
                                )}
                              >
                                {h} ч{' '}
                                <span className="text-[10px] text-muted-foreground">· {pct}%</span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 num-tabular font-bold text-xs bg-muted border-t border-l border-border text-info text-right">
                            {directionPlannedHours('testing', assignments, apiBacklog, settings)} ч
                          </td>
                          <td className="px-2 py-1.5 num-tabular font-bold text-xs bg-muted border-t border-l border-border text-warning text-right">
                            {directionPlannedHours('management', assignments, apiBacklog, settings)}{' '}
                            ч
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* Назначенные задачи */}
            {assignments.length > 0 && (
              <AssignedSummary
                assignments={assignments}
                backlog={apiBacklog}
                employees={allEmployees}
                onRemove={removeAssignment}
                disabled={planLocked}
              />
            )}

            {/* История */}
            <PlanHistory entries={history} />
          </TooltipProvider>

          <DragOverlay>
            {activeIssue ? (
              <div className="opacity-90 shadow-elevated">
                <BacklogCard issue={activeIssue} planned={false} disabled compact />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </AppLayout>
  );
};

// ====== Helper Components ======

function BacklogCard({
  issue,
  planned,
  disabled,
  compact,
  effectiveEstimateValue,
  spentValue,
  remainingValue,
  isSubtask,
  hasChildren,
}: {
  issue: BacklogIssue;
  planned: boolean;
  disabled?: boolean;
  compact?: boolean;
  effectiveEstimateValue?: number;
  spentValue?: number;
  remainingValue?: number;
  isSubtask?: boolean;
  hasChildren?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    disabled,
  });
  const isCritical = issue.priority === 'Blocker' || issue.priority === 'High';
  const estShown = effectiveEstimateValue ?? issue.estimateHours;
  const spentShown = spentValue ?? issue.spentHours ?? 0;
  const remainingShown = remainingValue ?? Math.max(0, estShown - spentShown);
  const isCarryOver = spentShown > 0;

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-sm border bg-card px-2 py-1.5 transition',
        isCritical
          ? 'border-l-2 border-l-destructive border-y-border border-r-border'
          : 'border-border',
        planned && 'bg-success/5 border-success/40',
        isSubtask && 'border-dashed',
        !disabled && 'cursor-grab active:cursor-grabbing hover:border-primary/50',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {isSubtask && (
            <span
              className="text-muted-foreground text-[10px] font-mono leading-none mr-0.5"
              aria-hidden
            >
              ↳
            </span>
          )}
          <a
            href={ytIssueUrl(issue.idReadable)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[11px] font-mono font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            {issue.idReadable}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <TypeBadge type={issue.type} />
          <PriorityBadge priority={issue.priority} />
        </div>
        {planned && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
      </div>
      <div className={cn('text-xs text-foreground mt-1 leading-snug', compact && 'line-clamp-1')}>
        {issue.summary}
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground flex-wrap">
          <span>· {STATE_LABEL_RU[issue.state]}</span>
          {isCarryOver && (
            <Badge
              variant="outline"
              className="font-normal text-[9px] py-0 h-3.5 px-1 bg-info/10 text-info border-info/30"
              title="Задача переходит из предыдущего периода — часть часов уже потрачена"
            >
              переходящая
            </Badge>
          )}
          <span>
            · оц <strong className="text-foreground num-tabular">{estShown}ч</strong>
            {hasChildren && <span className="text-muted-foreground/80"> (Σ)</span>}
          </span>
          {isCarryOver && (
            <span>
              · потр <strong className="text-foreground num-tabular">{spentShown}ч</strong>
            </span>
          )}
          <span>
            · гот <strong className="text-foreground num-tabular">{issue.readiness}%</strong>
          </span>
          {isCarryOver && (
            <span>
              · ост{' '}
              <strong
                className={cn('num-tabular', remainingShown <= 0 ? 'text-success' : 'text-warning')}
              >
                {remainingShown}ч
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (issue.parentIdReadable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          <div className="text-xs">
            Родитель: <span className="font-mono font-semibold">{issue.parentIdReadable}</span>
          </div>
          <div className="text-sm mt-0.5">{issue.parentSummary}</div>
        </TooltipContent>
      </Tooltip>
    );
  }
  return card;
}

function TypeBadge({ type }: { type: IssueType }) {
  const map: Record<IssueType, string> = {
    Epic: 'bg-primary/10 text-primary border-primary/30',
    Feature: 'bg-info/10 text-info border-info/30',
    Story: 'bg-success/10 text-success border-success/30',
    Task: 'bg-muted text-foreground border-border',
    Bug: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  return (
    <Badge variant="outline" className={cn('font-normal text-[9px] py-0 h-3.5 px-1', map[type])}>
      {TYPE_LABEL_RU[type]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    Blocker: 'bg-destructive text-destructive-foreground border-transparent',
    High: 'bg-warning/15 text-warning border-warning/40',
    Medium: 'bg-muted text-muted-foreground border-border',
    Low: 'bg-muted/50 text-muted-foreground border-border',
  };
  return (
    <Badge
      variant="outline"
      className={cn('font-normal text-[9px] py-0 h-3.5 px-1', map[priority])}
    >
      {PRIORITY_LABEL_RU[priority]}
    </Badge>
  );
}

function EmployeeCell({
  employeeId,
  role,
  accept,
  isHighlighted,
  children,
}: {
  employeeId: string;
  role: WorkRole;
  accept: boolean;
  isHighlighted: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `emp:${role}:${employeeId}`,
    disabled: !accept,
  });
  return (
    <td
      ref={setNodeRef}
      className={cn(
        'px-1.5 py-1 border-b border-border align-middle text-center transition-colors',
        isHighlighted && 'bg-primary-soft/30',
        isOver && 'bg-primary-soft outline outline-2 outline-primary/50 outline-offset-[-2px]',
      )}
    >
      <div className="flex items-center justify-center">{children}</div>
    </td>
  );
}

const ROLE_LABEL_SHORT: Record<WorkRole, string> = {
  development: 'разраб.',
  testing: 'тест.',
  management: 'упр.',
  other: '—',
};

function AssignedSummary({
  assignments,
  backlog,
  employees,
  onRemove,
  disabled,
}: {
  assignments: Assignment[];
  backlog: BacklogIssue[];
  employees: { id: string; name: string }[];
  onRemove: (issueId: string, role?: WorkRole) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-1.5 border-b border-border">
        <h2 className="text-xs font-semibold text-foreground">
          Назначения спринта · {assignments.length}
        </h2>
      </div>
      <div className="divide-y divide-border">
        {assignments.map((a) => {
          const issue = backlog.find((i) => i.id === a.issueId);
          const emp = employees.find((e) => e.id === a.employeeId);
          if (!issue || !emp) return null;
          return (
            <div
              key={`${a.issueId}-${a.role}`}
              className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-primary shrink-0">
                  {issue.idReadable}
                </span>
                <Badge variant="outline" className="text-[9px] py-0 h-4 px-1 shrink-0">
                  {ROLE_LABEL_SHORT[a.role]}
                </Badge>
                <span className="text-foreground truncate">{issue.summary}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">→ {emp.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => onRemove(a.issueId, a.role)}
                  disabled={disabled}
                >
                  Снять
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DirectionTotalRow({
  label,
  accentClass,
  directionHours,
  employeeCols,
}: {
  label: string;
  accentClass: string;
  directionHours: number;
  employeeCols: number;
}) {
  return (
    <tr className="bg-muted/60">
      <td className="sticky left-0 z-10 bg-muted/60 px-2 py-1 text-[11px] border-r border-border">
        <span className={cn('font-medium', accentClass)}>{label}</span>
      </td>
      {employeeCols > 0 && (
        <td
          colSpan={employeeCols}
          className={cn(
            'px-2 py-1 num-tabular font-semibold text-xs bg-muted/60 text-left',
            accentClass,
          )}
        >
          {directionHours} ч
        </td>
      )}
    </tr>
  );
}

function Legend({ settings }: { settings: SprintSettings }) {
  const items = [
    {
      label: `< ${Math.round(settings.yellowThreshold * 100)}%`,
      className: 'bg-success/15 border border-success/30',
    },
    {
      label: `${Math.round(settings.yellowThreshold * 100)}–${Math.round(settings.redThreshold * 100)}%`,
      className: 'bg-warning/20 border border-warning/40',
    },
    {
      label: `> ${Math.round(settings.redThreshold * 100)}%`,
      className: 'bg-destructive/20 border border-destructive/40',
    },
  ];
  return (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className={cn('h-2.5 w-4 rounded-sm', i.className)} />
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

function zoneHeaderBg(zone: ReturnType<typeof loadZone>): string {
  switch (zone) {
    case 'red':
      return 'bg-destructive/15';
    case 'yellow':
      return 'bg-warning/15';
    case 'normal':
      return 'bg-success/10';
    default:
      return 'bg-muted';
  }
}
function zoneTextClass(zone: ReturnType<typeof loadZone>): string {
  switch (zone) {
    case 'red':
      return 'text-destructive';
    case 'yellow':
      return 'text-warning';
    case 'normal':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
}

function SprintSettingsDialog({
  value,
  onSave,
}: {
  value: SprintSettings;
  onSave: (s: SprintSettings) => void;
}) {
  const [draft, setDraft] = useState<SprintSettings>(value);
  const set = <K extends keyof SprintSettings>(k: K, v: SprintSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Настройки спринта</DialogTitle>
        <DialogDescription>
          Параметры расчёта мощности и распределения часов согласно ТЗ СПО v2 §8.2 и §9.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5">
          <Label>Месяц</Label>
          <Select value={String(draft.month)} onValueChange={(v) => set('month', Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_RU.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Год</Label>
          <Input
            type="number"
            value={draft.year}
            onChange={(e) => set('year', Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Рабочих часов в месяце</Label>
          <Input
            type="number"
            value={draft.workHoursPerMonth}
            onChange={(e) => set('workHoursPerMonth', Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Резерв на внеплановые задачи, %</Label>
          <Input
            type="number"
            value={Math.round(draft.reservePercent * 100)}
            onChange={(e) => set('reservePercent', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>% отладки от оценки</Label>
          <Input
            type="number"
            value={Math.round(draft.debugPercent * 100)}
            onChange={(e) => set('debugPercent', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>% тестирования от оценки</Label>
          <Input
            type="number"
            value={Math.round(draft.testingPercent * 100)}
            onChange={(e) => set('testingPercent', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>% управления от оценки</Label>
          <Input
            type="number"
            value={Math.round(draft.managementPercent * 100)}
            onChange={(e) => set('managementPercent', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Жёлтый порог загрузки, %</Label>
          <Input
            type="number"
            value={Math.round(draft.yellowThreshold * 100)}
            onChange={(e) => set('yellowThreshold', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Красный порог загрузки, %</Label>
          <Input
            type="number"
            value={Math.round(draft.redThreshold * 100)}
            onChange={(e) => set('redThreshold', Number(e.target.value) / 100)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Рабочих часов в году</Label>
          <Input
            type="number"
            value={draft.workHoursPerYear}
            onChange={(e) => set('workHoursPerYear', Number(e.target.value))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(draft)} className="bg-primary hover:bg-primary-hover">
          Сохранить
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PlanHistory({ entries }: { entries: PlanHistoryEntry[] }) {
  const fmt = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold text-foreground">
          История изменений плана · {entries.length}
        </h2>
        <span className="text-[10px] text-muted-foreground">
          Фиксация и снятие фиксации спринта
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
          История пуста. Зафиксируйте план, чтобы записать событие.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
              <span className="text-[11px] text-muted-foreground num-tabular shrink-0 w-36">
                {fmt.format(e.at)}
              </span>
              {e.action === 'lock' ? (
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/30 text-[10px] py-0 h-4 px-1.5 shrink-0"
                >
                  <Lock className="h-2.5 w-2.5 mr-0.5" /> Зафиксирован
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/30 text-[10px] py-0 h-4 px-1.5 shrink-0"
                >
                  Снята фиксация
                </Badge>
              )}
              <span className="text-foreground font-medium shrink-0">Спринт {e.sprint}</span>
              <span className="text-muted-foreground num-tabular shrink-0">
                {e.tasks} задач · {e.hours} ч разработки
              </span>
              <span className="text-muted-foreground ml-auto truncate">{e.user}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Planning;
