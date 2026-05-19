import { Fragment, useMemo, useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

import { baseHourlyRateKop, DEFAULT_FINANCE_SETTINGS, formatRubInt, KOPECKS_PER_RUB } from "@/lib/finance";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock, Plus, Trash2, TrendingUp, UserCircle2, Loader2 } from "lucide-react";
import { request } from "@/lib/api";
import type { SalaryRecord } from "@/lib/finance";

interface UserDto {
  id: string;
  login: string;
  fullName: string | null;
  email: string | null;
  roles: string[];
  isActive: boolean;
}

interface RateDto {
  id: string;
  userId: string;
  monthlySalary: number;
  monthlyNetRub: number;
  annualHours: number;
  workHoursPerYear: number;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  changedById: string;
  changeReason: string | null;
  createdAt: string;
}

const DIRECTOR_ID = "__director__";

const SalaryRates = () => {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [rates, setRates] = useState<Record<string, RateDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [expandedEmps, setExpandedEmps] = useState<Record<string, boolean>>({});
  const [addForEmpId, setAddForEmpId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({
    monthlyNetRub: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    workHoursPerYear: String(DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
    comment: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const usersRes = await request<{ data: UserDto[]; total: number }>("/admin/users?limit=500");
      const userList = (usersRes.data || []).filter((u: UserDto) => u.isActive);
      setUsers(userList);
      if (userList.length > 0 && !viewerId) {
        setViewerId(DIRECTOR_ID);
      }
      const ratesMap: Record<string, RateDto[]> = {};
      const ratePromises = userList.map(async (u: UserDto) => {
        try {
          const historyData = await request<RateDto[]>("/admin/rates/" + u.id + "/history");
          ratesMap[u.id] = Array.isArray(historyData) ? historyData : [];
        } catch {
          ratesMap[u.id] = [];
        }
      });
      await Promise.all(ratePromises);
      setRates(ratesMap);
    } catch (err) {
      console.error("Failed to load salary data:", err);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные о ставках",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const isDirector = viewerId === DIRECTOR_ID;

  const viewerUser = useMemo(() => {
    if (!viewerId || viewerId === DIRECTOR_ID) return null;
    return users.find((u) => u.id === viewerId) ?? null;
  }, [viewerId, users]);

  const visibleEmployees = useMemo(() => {
    const emps = users.map((u) => ({
      id: u.id,
      name: u.fullName || u.login,
      position: u.roles?.join(", ") || "",
    }));
    if (viewerId === DIRECTOR_ID) return emps;
    if (viewerUser) {
      return emps.filter((e) => e.id === viewerId);
    }
    return [];
  }, [viewerId, users, viewerUser]);

  const currentByEmp = useMemo(() => {
    const map = new Map<string, RateDto>();
    for (const [empId, empRates] of Object.entries(rates)) {
      const sorted = [...empRates].sort((a, b) =>
        a.effectiveFrom < b.effectiveFrom ? 1 : -1
      );
      if (sorted.length > 0) map.set(empId, sorted[0]);
    }
    return map;
  }, [rates]);

  const historyByEmp = useMemo(() => {
    const map = new Map<string, RateDto[]>();
    for (const [empId, empRates] of Object.entries(rates)) {
      const sorted = [...empRates].sort((a, b) =>
        a.effectiveFrom < b.effectiveFrom ? 1 : -1
      );
      map.set(empId, sorted);
    }
    return map;
  }, [rates]);

  const toggleEmp = (id: string) =>
    setExpandedEmps((p) => ({ ...p, [id]: !p[id] }));

  const selectedEmp = useMemo(() => {
    if (!addForEmpId) return null;
    return users.find((u) => u.id === addForEmpId) ?? null;
  }, [addForEmpId, users]);

  const myHistory = useMemo(() => {
    if (!viewerId || viewerId === DIRECTOR_ID) return [];
    return rates[viewerId] || [];
  }, [viewerId, rates]);

  const submitNewRate = async () => {
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
      toast({ title: "Дата начала в формате YYYY-MM-DD", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const newRate = await request<RateDto>("/admin/rates/" + selectedEmp.id, {
        method: "POST",
        body: JSON.stringify({
          monthlyNetRub: rub,
          workHoursPerYear: wh,
          effectiveFrom: draft.effectiveFrom,
          changeReason: draft.comment.trim() || null,
        }),
      });
      setRates((prev) => {
        const empRates = prev[selectedEmp.id] || [];
        return { ...prev, [selectedEmp.id]: [...empRates, newRate] };
      });
      toast({
        title: "Новая ставка сохранена",
        description: (selectedEmp.fullName || selectedEmp.login) + ": " + formatRubInt(Math.round(rub * KOPECKS_PER_RUB)) + "/мес с " + draft.effectiveFrom,
      });
      setAddOpen(false);
      setDraft({
        monthlyNetRub: "",
        effectiveFrom: new Date().toISOString().slice(0, 10),
        workHoursPerYear: String(DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
        comment: "",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить ставку",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await request("/admin/rates/" + deleteTarget.id, { method: "DELETE" });
      setRates((prev) => {
        const empId = deleteTarget.userId;
        const empRates = (prev[empId] || []).filter((r) => r.id !== deleteTarget.id);
        return { ...prev, [empId]: empRates };
      });
      toast({
        title: "Ставка удалена",
        description: "Запись от " + deleteTarget.effectiveFrom + " удалена. Активной стала предыдущая.",
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить ставку",
        variant: "destructive",
      });
    }
    setDeleteTarget(null);
  };

  const renderHistoryTable = (
    records: RateDto[],
    opts: { canManage: boolean; emptyText: string },
  ) => {
    if (!records || records.length === 0) {
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
            <TableHead>Комментарий</TableHead>
            {opts.canManage && <TableHead className="w-[60px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r, i) => {
            const author = users.find((u) => u.id === r.changedById);
            const isCurrent = i === 0;
            return (
              <TableRow key={r.id} className={cn(isCurrent && "bg-emerald-500/5")}>
                <TableCell>
                  {isCurrent ? (
                    <Badge variant="outline" className="font-normal text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
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
                  {formatRubInt(Math.round(r.monthlyNetRub * KOPECKS_PER_RUB))}
                </TableCell>
                <TableCell className="text-right text-xs num-tabular text-muted-foreground">{r.workHoursPerYear}</TableCell>
                <TableCell className="text-right text-sm num-tabular font-medium">
                  {formatRubInt(baseHourlyRateKop({
                    monthlyNetKop: Math.round(r.monthlyNetRub * KOPECKS_PER_RUB),
                    workHoursPerYear: r.workHoursPerYear,
                  } as SalaryRecord))}/ч
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {author?.fullName || author?.login || r.changedById}
                </TableCell>
                <TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate">
                  {r.changeReason || "\u2014"}
                </TableCell>
                {opts.canManage && (
                  <TableCell>
                    {isCurrent && canDeleteCurrent ? (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Удалить текущую запись (активной станет предыдущая)"
                        onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/40"
                        title={isCurrent ? "Нельзя удалить единственную запись" : "Архивные записи удалять нельзя"}>
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

  const myCurrent = myHistory[0] || null;

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Ставки сотрудников" description="Загрузка данных..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Ставки сотрудников"
        description="Версионируемая история ЗП на руки и автоматически рассчитанной часовой ставки."
        breadcrumbs={[
          { label: "Главная" },
          { label: "Аналитика и финансы" },
          { label: "Ставки сотрудников" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Я как:</span>
            <Select value={viewerId || ""} onValueChange={(v) => { setViewerId(v); setExpandedEmps({}); }}>
              <SelectTrigger className="h-8 w-[280px] text-xs">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DIRECTOR_ID} className="text-xs">
                  {"\uD83D\uDC51"} Директор (видит всех)
                </SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {"\uD83D\uDC64"} {u.fullName || u.login}{u.roles?.length ? " (" + u.roles.join(", ") + ")" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {viewerId && viewerId !== DIRECTOR_ID && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Моя ставка</h3>
          </div>
          {myCurrent ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">ЗП на руки/мес</span>
                <p className="font-semibold text-base">{formatRubInt(Math.round(myCurrent.monthlyNetRub * KOPECKS_PER_RUB))}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Часовая ставка</span>
                <p className="font-semibold text-base">{formatRubInt(baseHourlyRateKop({ monthlyNetKop: Math.round(myCurrent.monthlyNetRub * KOPECKS_PER_RUB), workHoursPerYear: myCurrent.workHoursPerYear } as SalaryRecord))}/ч</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Действует с</span>
                <p className="font-semibold text-base">{myCurrent.effectiveFrom}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Для вас пока нет записей о ставке.
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить текущую ставку?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись от {deleteTarget?.effectiveFrom} будет удалена.
              {deleteTarget?.changeReason ? " Комментарий: \u0022" + deleteTarget.changeReason + "\u0022" : ""}
              {historyByEmp.get(deleteTarget?.userId || "")?.length && (historyByEmp.get(deleteTarget?.userId || "")?.length || 0) > 1 ? " Активной станет предыдущая запись." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForEmpId(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Новая ставка для {selectedEmp?.fullName || selectedEmp?.login || "сотрудника"}</DialogTitle>
            <DialogDescription>Укажите новый размер оплаты и дату начала действия.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">ЗП на руки, руб/мес</Label>
                <Input id="salary" type="text" inputMode="numeric" placeholder="150000"
                  value={draft.monthlyNetRub}
                  onChange={(e) => setDraft((p) => ({ ...p, monthlyNetRub: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Часов / год</Label>
                <Input id="hours" type="number" value={draft.workHoursPerYear}
                  onChange={(e) => setDraft((p) => ({ ...p, workHoursPerYear: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Дата начала действия</Label>
              <Input id="dateFrom" type="date" value={draft.effectiveFrom}
                onChange={(e) => setDraft((p) => ({ ...p, effectiveFrom: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий (необязательно)</Label>
              <Input id="comment" placeholder="Повышение по результатам..."
                value={draft.comment}
                onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={submitNewRate} disabled={submitting}>{submitting ? "Сохранение..." : "Сохранить"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[36px]"></TableHead>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead className="text-right">ЗП на руки/мес</TableHead>
              <TableHead className="text-right">Раб. часов/год</TableHead>
              <TableHead className="text-right">Базовая ставка</TableHead>
              <TableHead>Действует с</TableHead>
              <TableHead className="text-right">Версии</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEmployees.length > 0 ? visibleEmployees.map((e) => {
              const cur = currentByEmp.get(e.id);
              const empRecs = historyByEmp.get(e.id) ?? [];
              const versions = empRecs.length;
              const isOpen = !!expandedEmps[e.id];
              return (
                <Fragment key={e.id}>
                  <TableRow className={cn("cursor-pointer", isOpen && "bg-primary/5")} onClick={() => toggleEmp(e.id)}>
                    <TableCell className="px-2">
                      <button type="button" className="text-muted-foreground hover:text-foreground"
                        onClick={(ev) => { ev.stopPropagation(); toggleEmp(e.id); }}
                        aria-label={isOpen ? "Свернуть историю" : "Развернуть историю"}>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{e.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.position}</TableCell>
                    <TableCell className="text-right text-sm num-tabular">
                      {cur ? formatRubInt(Math.round(cur.monthlyNetRub * KOPECKS_PER_RUB)) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right text-xs num-tabular text-muted-foreground">
                      {cur ? cur.workHoursPerYear : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right text-sm num-tabular font-medium">
                      {cur ? formatRubInt(baseHourlyRateKop({ monthlyNetKop: Math.round(cur.monthlyNetRub * KOPECKS_PER_RUB), workHoursPerYear: cur.workHoursPerYear } as SalaryRecord)) + "/ч" : "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs">{cur ? cur.effectiveFrom : "\u2014"}</TableCell>
                    <TableCell className="text-right text-xs">
                      <Badge variant="outline" className="font-normal">{versions}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isDirector && (
                        <Button size="sm" variant="ghost" className="h-7"
                          onClick={(ev) => { ev.stopPropagation(); setAddForEmpId(e.id); setAddOpen(true); setExpandedEmps((p) => ({ ...p, [e.id]: true })); }}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Ставка
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
                            История ставок {"\u00B7"} {versions} {versions === 1 ? "запись" : "записей"}
                          </div>
                          <div className="rounded border border-border overflow-hidden bg-background">
                            {renderHistoryTable(empRecs, { canManage: isDirector, emptyText: "Для сотрудника пока нет записей о ставке." })}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Закрытые периоды используют ставку, действовавшую на момент закрытия.
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                  Нет сотрудников в зоне видимости.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
};

export default SalaryRates;
