"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const AppLayout_1 = require("@/components/layout/AppLayout");
const PageHeader_1 = require("@/components/layout/PageHeader");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const badge_1 = require("@/components/ui/badge");
const table_1 = require("@/components/ui/table");
const dialog_1 = require("@/components/ui/dialog");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
const select_1 = require("@/components/ui/select");
const finance_1 = require("@/lib/finance");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const api_1 = require("@/lib/api");
const DIRECTOR_ID = "__director__";
const SalaryRates = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const [users, setUsers] = (0, react_1.useState)([]);
    const [rates, setRates] = (0, react_1.useState)({});
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [viewerId, setViewerId] = (0, react_1.useState)(null);
    const [expandedEmps, setExpandedEmps] = (0, react_1.useState)({});
    const [addForEmpId, setAddForEmpId] = (0, react_1.useState)(null);
    const [addOpen, setAddOpen] = (0, react_1.useState)(false);
    const [deleteTarget, setDeleteTarget] = (0, react_1.useState)(null);
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [draft, setDraft] = (0, react_1.useState)({
        monthlyNetRub: "",
        effectiveFrom: new Date().toISOString().slice(0, 10),
        workHoursPerYear: String(finance_1.DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
        comment: "",
    });
    const loadData = (0, react_1.useCallback)(async () => {
        try {
            setLoading(true);
            const usersRes = await (0, api_1.request)("/admin/users?limit=500");
            const userList = (usersRes.data || []).filter((u) => u.isActive);
            setUsers(userList);
            if (userList.length > 0 && !viewerId) {
                setViewerId(DIRECTOR_ID);
            }
            const ratesMap = {};
            const ratePromises = userList.map(async (u) => {
                try {
                    const historyData = await (0, api_1.request)("/admin/rates/" + u.id + "/history");
                    ratesMap[u.id] = Array.isArray(historyData) ? historyData : [];
                }
                catch {
                    ratesMap[u.id] = [];
                }
            });
            await Promise.all(ratePromises);
            setRates(ratesMap);
        }
        catch (err) {
            console.error("Failed to load salary data:", err);
            toast({
                title: "Ошибка загрузки",
                description: "Не удалось загрузить данные о ставках",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        loadData();
    }, []);
    const isDirector = viewerId === DIRECTOR_ID;
    const viewerUser = (0, react_1.useMemo)(() => {
        if (!viewerId || viewerId === DIRECTOR_ID)
            return null;
        return users.find((u) => u.id === viewerId) ?? null;
    }, [viewerId, users]);
    const visibleEmployees = (0, react_1.useMemo)(() => {
        const emps = users.map((u) => ({
            id: u.id,
            name: u.fullName || u.login,
            position: u.roles?.join(", ") || "",
        }));
        if (viewerId === DIRECTOR_ID)
            return emps;
        if (viewerUser) {
            return emps.filter((e) => e.id === viewerId);
        }
        return [];
    }, [viewerId, users, viewerUser]);
    const currentByEmp = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const [empId, empRates] of Object.entries(rates)) {
            const sorted = [...empRates].sort((a, b) => a.effectiveFrom < b.effectiveFrom ? 1 : -1);
            if (sorted.length > 0)
                map.set(empId, sorted[0]);
        }
        return map;
    }, [rates]);
    const historyByEmp = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const [empId, empRates] of Object.entries(rates)) {
            const sorted = [...empRates].sort((a, b) => a.effectiveFrom < b.effectiveFrom ? 1 : -1);
            map.set(empId, sorted);
        }
        return map;
    }, [rates]);
    const toggleEmp = (id) => setExpandedEmps((p) => ({ ...p, [id]: !p[id] }));
    const selectedEmp = (0, react_1.useMemo)(() => {
        if (!addForEmpId)
            return null;
        return users.find((u) => u.id === addForEmpId) ?? null;
    }, [addForEmpId, users]);
    const myHistory = (0, react_1.useMemo)(() => {
        if (!viewerId || viewerId === DIRECTOR_ID)
            return [];
        return rates[viewerId] || [];
    }, [viewerId, rates]);
    const submitNewRate = async () => {
        if (!selectedEmp)
            return;
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
            const newRate = await (0, api_1.request)("/admin/rates/" + selectedEmp.id, {
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
                description: (selectedEmp.fullName || selectedEmp.login) + ": " + (0, finance_1.formatRubInt)(Math.round(rub * finance_1.KOPECKS_PER_RUB)) + "/мес с " + draft.effectiveFrom,
            });
            setAddOpen(false);
            setDraft({
                monthlyNetRub: "",
                effectiveFrom: new Date().toISOString().slice(0, 10),
                workHoursPerYear: String(finance_1.DEFAULT_FINANCE_SETTINGS.workHoursPerYear),
                comment: "",
            });
        }
        catch (err) {
            toast({
                title: "Ошибка",
                description: "Не удалось сохранить ставку",
                variant: "destructive",
            });
        }
        finally {
            setSubmitting(false);
        }
    };
    const confirmDelete = async () => {
        if (!deleteTarget)
            return;
        try {
            await (0, api_1.request)("/admin/rates/" + deleteTarget.id, { method: "DELETE" });
            setRates((prev) => {
                const empId = deleteTarget.userId;
                const empRates = (prev[empId] || []).filter((r) => r.id !== deleteTarget.id);
                return { ...prev, [empId]: empRates };
            });
            toast({
                title: "Ставка удалена",
                description: "Запись от " + deleteTarget.effectiveFrom + " удалена. Активной стала предыдущая.",
            });
        }
        catch (err) {
            toast({
                title: "Ошибка",
                description: "Не удалось удалить ставку",
                variant: "destructive",
            });
        }
        setDeleteTarget(null);
    };
    const renderHistoryTable = (records, opts) => {
        if (!records || records.length === 0) {
            return (<div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {opts.emptyText}
        </div>);
        }
        const canDeleteCurrent = opts.canManage && records.length >= 2;
        return (<table_1.Table>
        <table_1.TableHeader>
          <table_1.TableRow className="bg-muted/20">
            <table_1.TableHead className="w-[110px]">Статус</table_1.TableHead>
            <table_1.TableHead>Действует с</table_1.TableHead>
            <table_1.TableHead className="text-right">ЗП на руки/мес</table_1.TableHead>
            <table_1.TableHead className="text-right">Раб. часов/год</table_1.TableHead>
            <table_1.TableHead className="text-right">Часовая ставка</table_1.TableHead>
            <table_1.TableHead>Автор</table_1.TableHead>
            <table_1.TableHead>Комментарий</table_1.TableHead>
            {opts.canManage && <table_1.TableHead className="w-[60px]"></table_1.TableHead>}
          </table_1.TableRow>
        </table_1.TableHeader>
        <table_1.TableBody>
          {records.map((r, i) => {
                const author = users.find((u) => u.id === r.changedById);
                const isCurrent = i === 0;
                return (<table_1.TableRow key={r.id} className={(0, utils_1.cn)(isCurrent && "bg-emerald-500/5")}>
                <table_1.TableCell>
                  {isCurrent ? (<badge_1.Badge variant="outline" className="font-normal text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                      Текущая
                    </badge_1.Badge>) : (<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <lucide_react_1.Lock className="h-3 w-3"/> Архив
                    </span>)}
                </table_1.TableCell>
                <table_1.TableCell className="text-sm font-medium">{r.effectiveFrom}</table_1.TableCell>
                <table_1.TableCell className="text-right text-sm num-tabular">
                  {(0, finance_1.formatRubInt)(Math.round(r.monthlyNetRub * finance_1.KOPECKS_PER_RUB))}
                </table_1.TableCell>
                <table_1.TableCell className="text-right text-xs num-tabular text-muted-foreground">{r.workHoursPerYear}</table_1.TableCell>
                <table_1.TableCell className="text-right text-sm num-tabular font-medium">
                  {(0, finance_1.formatRubInt)((0, finance_1.baseHourlyRateKop)({
                        monthlyNetKop: Math.round(r.monthlyNetRub * finance_1.KOPECKS_PER_RUB),
                        workHoursPerYear: r.workHoursPerYear,
                    }))}/ч
                </table_1.TableCell>
                <table_1.TableCell className="text-xs text-muted-foreground">
                  {author?.fullName || author?.login || r.changedById}
                </table_1.TableCell>
                <table_1.TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate">
                  {r.changeReason || "\u2014"}
                </table_1.TableCell>
                {opts.canManage && (<table_1.TableCell>
                    {isCurrent && canDeleteCurrent ? (<button_1.Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" title="Удалить текущую запись (активной станет предыдущая)" onClick={() => setDeleteTarget(r)}>
                        <lucide_react_1.Trash2 className="h-3.5 w-3.5"/>
                      </button_1.Button>) : (<span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/40" title={isCurrent ? "Нельзя удалить единственную запись" : "Архивные записи удалять нельзя"}>
                        <lucide_react_1.Trash2 className="h-3.5 w-3.5"/>
                      </span>)}
                  </table_1.TableCell>)}
              </table_1.TableRow>);
            })}
        </table_1.TableBody>
      </table_1.Table>);
    };
    const myCurrent = myHistory[0] || null;
    if (loading) {
        return (<AppLayout_1.AppLayout>
        <PageHeader_1.PageHeader title="Ставки сотрудников" description="Загрузка данных..."/>
        <div className="flex items-center justify-center py-20">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
        </div>
      </AppLayout_1.AppLayout>);
    }
    return (<AppLayout_1.AppLayout>
      <PageHeader_1.PageHeader title="Ставки сотрудников" description="Версионируемая история ЗП на руки и автоматически рассчитанной часовой ставки." breadcrumbs={[
            { label: "Главная" },
            { label: "Аналитика и финансы" },
            { label: "Ставки сотрудников" },
        ]} actions={<div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Я как:</span>
            <select_1.Select value={viewerId || ""} onValueChange={(v) => { setViewerId(v); setExpandedEmps({}); }}>
              <select_1.SelectTrigger className="h-8 w-[280px] text-xs">
                <select_1.SelectValue placeholder="Выберите роль"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value={DIRECTOR_ID} className="text-xs">
                  {"\uD83D\uDC51"} Директор (видит всех)
                </select_1.SelectItem>
                {users.map((u) => (<select_1.SelectItem key={u.id} value={u.id} className="text-xs">
                    {"\uD83D\uDC64"} {u.fullName || u.login}{u.roles?.length ? " (" + u.roles.join(", ") + ")" : ""}
                  </select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>}/>

      {viewerId && viewerId !== DIRECTOR_ID && (<div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <lucide_react_1.TrendingUp className="h-4 w-4 text-primary"/>
            <h3 className="text-sm font-semibold">Моя ставка</h3>
          </div>
          {myCurrent ? (<div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">ЗП на руки/мес</span>
                <p className="font-semibold text-base">{(0, finance_1.formatRubInt)(Math.round(myCurrent.monthlyNetRub * finance_1.KOPECKS_PER_RUB))}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Часовая ставка</span>
                <p className="font-semibold text-base">{(0, finance_1.formatRubInt)((0, finance_1.baseHourlyRateKop)({ monthlyNetKop: Math.round(myCurrent.monthlyNetRub * finance_1.KOPECKS_PER_RUB), workHoursPerYear: myCurrent.workHoursPerYear }))}/ч</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Действует с</span>
                <p className="font-semibold text-base">{myCurrent.effectiveFrom}</p>
              </div>
            </div>) : (<div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Для вас пока нет записей о ставке.
            </div>)}
        </div>)}

      <alert_dialog_1.AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle>Удалить текущую ставку?</alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription>
              Запись от {deleteTarget?.effectiveFrom} будет удалена.
              {deleteTarget?.changeReason ? " Комментарий: \u0022" + deleteTarget.changeReason + "\u0022" : ""}
              {historyByEmp.get(deleteTarget?.userId || "")?.length && (historyByEmp.get(deleteTarget?.userId || "")?.length || 0) > 1 ? " Активной станет предыдущая запись." : ""}
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel>Отмена</alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>

      <dialog_1.Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o)
        setAddForEmpId(null); }}>
        <dialog_1.DialogContent className="sm:max-w-[440px]">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Новая ставка для {selectedEmp?.fullName || selectedEmp?.login || "сотрудника"}</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>Укажите новый размер оплаты и дату начала действия.</dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label_1.Label htmlFor="salary">ЗП на руки, руб/мес</label_1.Label>
                <input_1.Input id="salary" type="text" inputMode="numeric" placeholder="150000" value={draft.monthlyNetRub} onChange={(e) => setDraft((p) => ({ ...p, monthlyNetRub: e.target.value }))}/>
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="hours">Часов / год</label_1.Label>
                <input_1.Input id="hours" type="number" value={draft.workHoursPerYear} onChange={(e) => setDraft((p) => ({ ...p, workHoursPerYear: e.target.value }))}/>
              </div>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="dateFrom">Дата начала действия</label_1.Label>
              <input_1.Input id="dateFrom" type="date" value={draft.effectiveFrom} onChange={(e) => setDraft((p) => ({ ...p, effectiveFrom: e.target.value }))}/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="comment">Комментарий (необязательно)</label_1.Label>
              <input_1.Input id="comment" placeholder="Повышение по результатам..." value={draft.comment} onChange={(e) => setDraft((p) => ({ ...p, comment: e.target.value }))}/>
            </div>
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</button_1.Button>
            <button_1.Button onClick={submitNewRate} disabled={submitting}>{submitting ? "Сохранение..." : "Сохранить"}</button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      <div className="rounded-md border border-border overflow-hidden">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow className="bg-muted/40">
              <table_1.TableHead className="w-[36px]"></table_1.TableHead>
              <table_1.TableHead>Сотрудник</table_1.TableHead>
              <table_1.TableHead>Роль</table_1.TableHead>
              <table_1.TableHead className="text-right">ЗП на руки/мес</table_1.TableHead>
              <table_1.TableHead className="text-right">Раб. часов/год</table_1.TableHead>
              <table_1.TableHead className="text-right">Базовая ставка</table_1.TableHead>
              <table_1.TableHead>Действует с</table_1.TableHead>
              <table_1.TableHead className="text-right">Версии</table_1.TableHead>
              <table_1.TableHead></table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {visibleEmployees.length > 0 ? visibleEmployees.map((e) => {
            const cur = currentByEmp.get(e.id);
            const empRecs = historyByEmp.get(e.id) ?? [];
            const versions = empRecs.length;
            const isOpen = !!expandedEmps[e.id];
            return (<react_1.Fragment key={e.id}>
                  <table_1.TableRow className={(0, utils_1.cn)("cursor-pointer", isOpen && "bg-primary/5")} onClick={() => toggleEmp(e.id)}>
                    <table_1.TableCell className="px-2">
                      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={(ev) => { ev.stopPropagation(); toggleEmp(e.id); }} aria-label={isOpen ? "Свернуть историю" : "Развернуть историю"}>
                        {isOpen ? <lucide_react_1.ChevronDown className="h-4 w-4"/> : <lucide_react_1.ChevronRight className="h-4 w-4"/>}
                      </button>
                    </table_1.TableCell>
                    <table_1.TableCell className="font-medium text-sm">{e.name}</table_1.TableCell>
                    <table_1.TableCell className="text-xs text-muted-foreground">{e.position}</table_1.TableCell>
                    <table_1.TableCell className="text-right text-sm num-tabular">
                      {cur ? (0, finance_1.formatRubInt)(Math.round(cur.monthlyNetRub * finance_1.KOPECKS_PER_RUB)) : "\u2014"}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right text-xs num-tabular text-muted-foreground">
                      {cur ? cur.workHoursPerYear : "\u2014"}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right text-sm num-tabular font-medium">
                      {cur ? (0, finance_1.formatRubInt)((0, finance_1.baseHourlyRateKop)({ monthlyNetKop: Math.round(cur.monthlyNetRub * finance_1.KOPECKS_PER_RUB), workHoursPerYear: cur.workHoursPerYear })) + "/ч" : "\u2014"}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-xs">{cur ? cur.effectiveFrom : "\u2014"}</table_1.TableCell>
                    <table_1.TableCell className="text-right text-xs">
                      <badge_1.Badge variant="outline" className="font-normal">{versions}</badge_1.Badge>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {isDirector && (<button_1.Button size="sm" variant="ghost" className="h-7" onClick={(ev) => { ev.stopPropagation(); setAddForEmpId(e.id); setAddOpen(true); setExpandedEmps((p) => ({ ...p, [e.id]: true })); }}>
                          <lucide_react_1.Plus className="h-3.5 w-3.5 mr-1"/>Ставка
                        </button_1.Button>)}
                    </table_1.TableCell>
                  </table_1.TableRow>
                  {isOpen && (<table_1.TableRow className="bg-muted/10 hover:bg-muted/10">
                      <table_1.TableCell colSpan={9} className="p-0">
                        <div className="px-4 py-3 border-t border-border">
                          <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                            <lucide_react_1.UserCircle2 className="h-3.5 w-3.5"/>
                            История ставок {"\u00B7"} {versions} {versions === 1 ? "запись" : "записей"}
                          </div>
                          <div className="rounded border border-border overflow-hidden bg-background">
                            {renderHistoryTable(empRecs, { canManage: isDirector, emptyText: "Для сотрудника пока нет записей о ставке." })}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Закрытые периоды используют ставку, действовавшую на момент закрытия.
                          </div>
                        </div>
                      </table_1.TableCell>
                    </table_1.TableRow>)}
                </react_1.Fragment>);
        }) : (<table_1.TableRow>
                <table_1.TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">
                  Нет сотрудников в зоне видимости.
                </table_1.TableCell>
              </table_1.TableRow>)}
          </table_1.TableBody>
        </table_1.Table>
      </div>
    </AppLayout_1.AppLayout>);
};
exports.default = SalaryRates;
//# sourceMappingURL=SalaryRates.js.map