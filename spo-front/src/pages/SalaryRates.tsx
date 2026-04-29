// «Ставки сотрудников» — версионируемая история ЗП и часовой ставки (ТЗ §14.2).
//
// Видимость:
// - Директор — видит всех сотрудников, может добавлять и удалять записи.
// - Руководитель — видит свою ставку и ставки прямых/косвенных подчинённых (read-only).
// - Сотрудник — видит только свою ставку и историю (read-only).
//
// Удаление:
// - Удалять можно ТОЛЬКО текущую активную запись и только если в истории
//   есть хотя бы одна более ранняя запись (тогда активной становится она).
// - Прошлые (неактивные) записи удалить нельзя — они зафиксированы в закрытых периодах.

import { Fragment, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock, Plus, Trash2, TrendingUp, UserCircle2 } from "lucide-react";
import {
  baseHourlyRateKop,
  DEFAULT_FINANCE_SETTINGS,
  formatRubInt,
  initialSalaryHistory,
  KOPECKS_PER_RUB,
  type SalaryRecord,
} from "@/data/salaryMock";
import {
  DIRECTOR_ID,
  getSubordinates,
  orgEmployees,
  type EmployeeOrg,
} from "@/data/timesheetsMock";

// Демо-переключатель «вошедшего».
const VIEWER_OPTIONS = [
  { id: "e-pm-1", label: "Морозов И. К. (Директор)" },
  { id: "e-pm-2", label: "Лебедева О. А. (Руководитель)" },
  { id: "e-pm-3", label: "Беляев С. В. (Руководитель QA)" },
  { id: "e-dev-2", label: "Орлова Т. М. (Сотрудник)" },
];

const SalaryRates = () => {
  const { toast } = useToast();
  const [viewerId, setViewerId] = useState(DIRECTOR_ID);
  const [history, setHistory] = useState<SalaryRecord[]>(initialSalaryHistory);
  const [expandedEmps, setExpandedEmps] = useState<Record<string, boolean>>({});
  const [addForEmpId, setAddForEmpId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryRecord | null>(null);
  const [draft, setDraft] = useState({
    monthlyNetRub: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    workHoursPerYear: String(DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
    comment: "",
  });

  const isDirector = viewerId === DIRECTOR_ID;
  const viewer = orgEmployees.find((e) => e.id === viewerId)!;

  // Подчинённые видимого (прямые + косвенные).
  const subordinates = useMemo(() => getSubordinates(viewerId), [viewerId]);
  const isManagerOfSomeone = subordinates.length > 0 && !isDirector;

  // Список сотрудников, которых видит текущий viewer (без него самого).
  const visibleEmployees: EmployeeOrg[] = useMemo(() => {
    if (isDirector) return orgEmployees.filter((e) => e.id !== viewerId);
    return subordinates;
  }, [isDirector, subordinates, viewerId]);

  // Текущая (последняя по дате) запись по сотруднику.
  const currentByEmp = useMemo(() => {
    const map = new Map<string, SalaryRecord>();
    for (const r of history) {
      const cur = map.get(r.employeeId);
      if (!cur || r.effectiveFrom > cur.effectiveFrom) map.set(r.employeeId, r);
    }
    return map;
  }, [history]);

  const selectedEmp: EmployeeOrg | null = useMemo(() => {
    if (!addForEmpId) return null;
    return orgEmployees.find((e) => e.id === addForEmpId) ?? null;
  }, [addForEmpId]);

  const historyByEmp = useMemo(() => {
    const map = new Map<string, SalaryRecord[]>();
    for (const r of history) {
      const arr = map.get(r.employeeId) ?? [];
      arr.push(r);
      map.set(r.employeeId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
    }
    return map;
  }, [history]);

  const toggleEmp = (id: string) =>
    setExpandedEmps((p) => ({ ...p, [id]: !p[id] }));

  // Личная история (для viewer'а).
  const myHistory = useMemo(
    () =>
      history
        .filter((h) => h.employeeId === viewerId)
        .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)),
    [history, viewerId],
  );

  const submitNewRate = () => {
    if (!selectedEmp) return;
    const rub = Number(draft.monthlyNetRub.replace(/\s/g, "").replace(",", "."));
    const wh = Number(draft.workHoursPerYear);
    if (!Number.isFinite(rub) || rub <= 0) {
      toast({ title: "Укажите корректную ЗП", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(wh) || wh <= 0) {
      toast({ title: "Укажите часы в году", variant: "destructive" });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveFrom)) {
      toast({ title: "Дата начала действия в формате YYYY-MM-DD", variant: "destructive" });
      return;
    }
    const rec: SalaryRecord = {
      id: `sal-${selectedEmp.id}-${draft.effectiveFrom}-${Date.now()}`,
      employeeId: selectedEmp.id,
      effectiveFrom: draft.effectiveFrom,
      monthlyNetKop: Math.round(rub * KOPECKS_PER_RUB),
      workHoursPerYear: Math.round(wh),
      createdBy: viewerId,
      createdAt: new Date().toISOString(),
      comment: draft.comment.trim() || undefined,
    };
    setHistory((prev) => [...prev, rec]);
    toast({
      title: "Новая ставка сохранена",
      description: `${selectedEmp.name}: ${formatRubInt(rec.monthlyNetKop)}/мес с ${rec.effectiveFrom}`,
    });
    setAddOpen(false);
    setDraft({
      monthlyNetRub: "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      workHoursPerYear: String(DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
      comment: "",
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setHistory((prev) => prev.filter((h) => h.id !== deleteTarget.id));
    toast({
      title: "Ставка удалена",
      description: `Запись от ${deleteTarget.effectiveFrom} удалена. Активной стала предыдущая.`,
    });
    setDeleteTarget(null);
  };

  // ------- Renderers -------

  const renderEmployeeList = () => (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[36px]"></TableHead>
            <TableHead>Сотрудник</TableHead>
            <TableHead>Должность</TableHead>
            <TableHead className="text-right">ЗП на руки/мес</TableHead>
            <TableHead className="text-right">Раб. часов/год</TableHead>
            <TableHead className="text-right">Базовая ставка</TableHead>
            <TableHead>Действует с</TableHead>
            <TableHead className="text-right">Версий</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleEmployees.map((e) => {
            const cur = currentByEmp.get(e.id);
            const empRecs = historyByEmp.get(e.id) ?? [];
            const versions = empRecs.length;
            const isOpen = !!expandedEmps[e.id];
            return (
              <Fragment key={e.id}>
                <TableRow
                  className={cn("cursor-pointer", isOpen && "bg-primary/5")}
                  onClick={() => toggleEmp(e.id)}
                >
                  <TableCell className="px-2">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleEmp(e.id);
                      }}
                      aria-label={isOpen ? "Свернуть историю" : "Раскрыть историю"}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{e.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.position}</TableCell>
                  <TableCell className="text-right text-sm num-tabular">
                    {cur ? formatRubInt(cur.monthlyNetKop) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                    {cur ? cur.workHoursPerYear : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm num-tabular font-medium">
                    {cur ? `${formatRubInt(baseHourlyRateKop(cur))}/ч` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{cur ? cur.effectiveFrom : "—"}</TableCell>
                  <TableCell className="text-right text-xs">
                    <Badge variant="outline" className="font-normal">
                      {versions}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isDirector && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setAddForEmpId(e.id);
                          setAddOpen(true);
                          setExpandedEmps((p) => ({ ...p, [e.id]: true }));
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Ставка
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-4 py-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                          <UserCircle2 className="h-3.5 w-3.5" />
                          История ставок · {versions} {versions === 1 ? "запись" : "записей"}
                        </div>
                        <div className="rounded border border-border overflow-hidden bg-background">
                          {renderHistoryTable(empRecs, {
                            canManage: isDirector,
                            emptyText: "Для сотрудника пока нет записей о ставке.",
                          })}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Закрытые периоды используют ставку, действовавшую на момент закрытия.
                          Новая запись не пересчитывает прошлые табели (ТЗ §14.2).
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {visibleEmployees.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                Нет сотрудников в зоне видимости.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Универсальный рендер истории (для «моей» и «сотрудника»). canManage = можно
  // удалять текущую активную запись и добавлять новую.
  const renderHistoryTable = (
    records: SalaryRecord[],
    opts: { canManage: boolean; emptyText: string },
  ) => {
    if (records.length === 0) {
      return (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {opts.emptyText}
        </div>
      );
    }
    const canDeleteCurrent = opts.canManage && records.length >= 2;
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead className="w-[110px]">Статус</TableHead>
            <TableHead>Действует с</TableHead>
            <TableHead className="text-right">ЗП на руки/мес</TableHead>
            <TableHead className="text-right">Раб. часов/год</TableHead>
            <TableHead className="text-right">Часовая ставка</TableHead>
            <TableHead>Автор</TableHead>
            <TableHead>Дата записи</TableHead>
            <TableHead>Комментарий</TableHead>
            {opts.canManage && <TableHead className="w-[60px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r, i) => {
            const author = orgEmployees.find((e) => e.id === r.createdBy);
            const isCurrent = i === 0;
            return (
              <TableRow key={r.id} className={cn(isCurrent && "bg-emerald-500/5")}>
                <TableCell>
                  {isCurrent ? (
                    <Badge
                      variant="outline"
                      className="font-normal text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                    >
                      Текущая
                    </Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Архив
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">{r.effectiveFrom}</TableCell>
                <TableCell className="text-right text-sm num-tabular">
                  {formatRubInt(r.monthlyNetKop)}
                </TableCell>
                <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                  {r.workHoursPerYear}
                </TableCell>
                <TableCell className="text-right text-sm num-tabular font-medium">
                  {formatRubInt(baseHourlyRateKop(r))}/ч
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {author?.name ?? r.createdBy}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell className="text-xs italic text-muted-foreground">
                  {r.comment ?? "—"}
                </TableCell>
                {opts.canManage && (
                  <TableCell>
                    {isCurrent && canDeleteCurrent ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Удалить текущую запись (активной станет предыдущая)"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/40"
                        title={
                          isCurrent
                            ? "Нельзя удалить единственную запись"
                            : "Архивные записи удалять нельзя"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  // Заголовок блока «Моя ставка».
  const myCurrent = myHistory[0];

  return (
    <AppLayout>
      <PageHeader
        title="Ставки сотрудников"
        description="Версионируемая история ЗП на руки и автоматически рассчитанной часовой ставки. Видимость — по оргструктуре."
        breadcrumbs={[
          { label: "Главная" },
          { label: "Аналитика и финансы" },
          { label: "Ставки сотрудников" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Я как:</span>
            <Select value={viewerId} onValueChange={(v) => { setViewerId(v); setExpandedEmps({}); }}>
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
        }
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-primary/5 text-xs text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span>
            Базовая часовая ставка ={" "}
            <span className="font-medium">ЗП × 12 / Раб. часов в году</span>.
            По умолчанию: {DEFAULT_FINANCE_SETTINGS.workHoursPerYear} ч/год.
          </span>
        </div>

        {/* Блок 1: Моя ставка — для всех ролей */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Моя ставка</h2>
              <p className="text-xs text-muted-foreground">
                {viewer.name} · {viewer.position}
                {myCurrent && (
                  <>
                    {" · "}текущая: <span className="font-medium text-foreground">
                      {formatRubInt(myCurrent.monthlyNetKop)}/мес
                    </span>
                    {" "}({formatRubInt(baseHourlyRateKop(myCurrent))}/ч)
                  </>
                )}
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] font-normal">
              {myHistory.length} {myHistory.length === 1 ? "запись" : "записей"}
            </Badge>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            {renderHistoryTable(myHistory, {
              canManage: false,
              emptyText: "У вас пока нет записей о ставке.",
            })}
          </div>
        </section>

        {/* Блок 2: Ставки сотрудников — для директора и руководителей */}
        {(isDirector || isManagerOfSomeone) && (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {isDirector ? "Ставки сотрудников" : "Ставки моих подчинённых"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isDirector
                    ? "Все сотрудники компании. Доступно добавление новой ставки и удаление текущей активной записи."
                    : `Прямые и косвенные подчинённые: ${subordinates.length}. Только просмотр.`}
                </p>
              </div>
            </div>
            {renderEmployeeList()}
          </section>
        )}
      </div>

      {/* Dialog: новая запись ставки (только директор) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая ставка для {selectedEmp?.name ?? "сотрудника"}</DialogTitle>
            <DialogDescription>
              Запись применяется по расчётному месяцу: для всех месяцев, чей последний
              день ≥ даты начала действия. Прошлые закрытые периоды не пересчитываются.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ЗП на руки в месяц, ₽</Label>
              <Input
                value={draft.monthlyNetRub}
                onChange={(e) => setDraft({ ...draft, monthlyNetRub: e.target.value })}
                placeholder="например, 250000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Действует с</Label>
              <Input
                type="date"
                value={draft.effectiveFrom}
                onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Рабочих часов в году</Label>
              <Input
                value={draft.workHoursPerYear}
                onChange={(e) => setDraft({ ...draft, workHoursPerYear: e.target.value })}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Расчётная ставка/ч</Label>
              <Input
                disabled
                value={(() => {
                  const rub = Number(draft.monthlyNetRub.replace(/\s/g, "").replace(",", "."));
                  const wh = Number(draft.workHoursPerYear);
                  if (!rub || !wh) return "—";
                  return `${formatRubInt(Math.round((rub * 12 * KOPECKS_PER_RUB) / wh))}/ч`;
                })()}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Комментарий</Label>
              <Textarea
                rows={2}
                value={draft.comment}
                onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
                placeholder="Например: индексация на 2026, повышение по итогам ревью"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submitNewRate}>Сохранить ставку</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления текущей активной ставки */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить текущую ставку?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Запись от <span className="font-medium">{deleteTarget.effectiveFrom}</span>{" "}
                  ({formatRubInt(deleteTarget.monthlyNetKop)}/мес) будет удалена.
                  Активной автоматически станет предыдущая запись из истории.
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Действие необратимо. Архивные (неактивные) записи удалить нельзя.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default SalaryRates;
