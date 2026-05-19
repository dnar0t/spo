"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const PageHeader_1 = require("@/components/layout/PageHeader");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const select_1 = require("@/components/ui/select");
const badge_1 = require("@/components/ui/badge");
const textarea_1 = require("@/components/ui/textarea");
const tabs_1 = require("@/components/ui/tabs");
const dialog_1 = require("@/components/ui/dialog");
const switch_1 = require("@/components/ui/switch");
const use_toast_1 = require("@/hooks/use-toast");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const auth_1 = require("@/lib/auth");
const useAdmin_1 = require("@/hooks/useAdmin");
const SyncDialog_1 = require("@/components/SyncDialog");
const planning_1 = require("@/lib/planning");
function LoadingBlock({ text = 'Загрузка...' }) {
    return (<div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
      <lucide_react_1.Loader2 className="h-5 w-5 animate-spin"/>
      <span className="text-sm">{text}</span>
    </div>);
}
function ErrorBlock({ message, onRetry }) {
    return (<div className="flex flex-col items-center justify-center py-12 gap-3 text-destructive">
      <lucide_react_1.AlertCircle className="h-8 w-8"/>
      <p className="text-sm text-center max-w-md">{message}</p>
      {onRetry && (<button_1.Button size="sm" variant="outline" onClick={onRetry}>
          <lucide_react_1.RefreshCw className="h-3.5 w-3.5 mr-1"/> Повторить
        </button_1.Button>)}
    </div>);
}
function sprintLabel(d) {
    const month = d.month;
    const year = d.year;
    if (month != null && year != null && month >= 1 && month <= 12) {
        return `${planning_1.MONTHS_RU[month - 1]} ${year}`;
    }
    try {
        const dt = new Date(d.createdAt);
        const m = planning_1.MONTHS_RU[dt.getMonth()];
        return `${m} ${dt.getFullYear()}`;
    }
    catch {
        return '—';
    }
}
function itemToForm(item) {
    return {
        workHoursPerMonth: item.workHoursPerMonth ?? planning_1.DEFAULT_SPRINT_SETTINGS.workHoursPerMonth,
        month: item.month ?? planning_1.DEFAULT_SPRINT_SETTINGS.month,
        year: item.year ?? planning_1.DEFAULT_SPRINT_SETTINGS.year,
        reservePercent: item.reservePercent ?? planning_1.DEFAULT_SPRINT_SETTINGS.reservePercent,
        debugPercent: item.debugPercent ?? planning_1.DEFAULT_SPRINT_SETTINGS.debugPercent,
        testingPercent: item.testPercent ?? planning_1.DEFAULT_SPRINT_SETTINGS.testingPercent,
        managementPercent: item.mgmtPercent ?? planning_1.DEFAULT_SPRINT_SETTINGS.managementPercent,
        yellowThreshold: item.yellowThreshold ?? planning_1.DEFAULT_SPRINT_SETTINGS.yellowThreshold,
        redThreshold: item.redThreshold ?? planning_1.DEFAULT_SPRINT_SETTINGS.redThreshold,
    };
}
function defaultValueForm() {
    return {
        workHoursPerMonth: planning_1.DEFAULT_SPRINT_SETTINGS.workHoursPerMonth,
        month: planning_1.DEFAULT_SPRINT_SETTINGS.month,
        year: planning_1.DEFAULT_SPRINT_SETTINGS.year,
        reservePercent: planning_1.DEFAULT_SPRINT_SETTINGS.reservePercent,
        debugPercent: planning_1.DEFAULT_SPRINT_SETTINGS.debugPercent,
        testingPercent: planning_1.DEFAULT_SPRINT_SETTINGS.testingPercent,
        managementPercent: planning_1.DEFAULT_SPRINT_SETTINGS.managementPercent,
        yellowThreshold: planning_1.DEFAULT_SPRINT_SETTINGS.yellowThreshold,
        redThreshold: planning_1.DEFAULT_SPRINT_SETTINGS.redThreshold,
    };
}
function formToDto(f) {
    return {
        workHoursPerMonth: f.workHoursPerMonth,
        month: f.month,
        year: f.year,
        reservePercent: f.reservePercent,
        testPercent: f.testingPercent,
        debugPercent: f.debugPercent,
        mgmtPercent: f.managementPercent,
        yellowThreshold: f.yellowThreshold,
        redThreshold: f.redThreshold,
    };
}
const Settings = () => {
    const { toast } = (0, use_toast_1.useToast)();
    const { useListPlanningSettings, useCreatePlanningSettings, useUpdatePlanningSettings, useDeletePlanningSettings, useIntegrations, useUpdateIntegration, useDictionaries, } = (0, useAdmin_1.useAdmin)();
    const { data: planningList, isLoading: planningLoading, isError: planningError, refetch: refetchPlanning, } = useListPlanningSettings();
    const createSprint = useCreatePlanningSettings();
    const updateSprint = useUpdatePlanningSettings();
    const deleteSprint = useDeletePlanningSettings();
    const [editMode, setEditMode] = (0, react_1.useState)('none');
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(defaultValueForm());
    const openCreate = () => {
        setEditMode('create');
        setEditId(null);
        setForm(defaultValueForm());
    };
    const openEdit = (item) => {
        setEditMode('edit');
        setEditId(item.id);
        setForm(itemToForm(item));
    };
    const closeForm = () => {
        setEditMode('none');
        setEditId(null);
    };
    const setF = (k, v) => setForm((d) => ({ ...d, [k]: v }));
    const handleSave = () => {
        if (editMode === 'create') {
            createSprint.mutate(formToDto(form), {
                onSuccess: () => {
                    closeForm();
                },
            });
        }
        else if (editMode === 'edit' && editId) {
            updateSprint.mutate({ id: editId, ...formToDto(form) }, {
                onSuccess: () => {
                    closeForm();
                },
            });
        }
    };
    const handleDelete = (id) => {
        if (window.confirm('Удалить эту конфигурацию спринта?')) {
            deleteSprint.mutate(id, {
                onSuccess: () => {
                    if (editId === id)
                        closeForm();
                },
            });
        }
    };
    const isSaving = createSprint.isPending || updateSprint.isPending || deleteSprint.isPending;
    const { data: integrationsData, isLoading: integrationsLoading, isError: integrationsError, refetch: refetchIntegrations, } = useIntegrations();
    const updateIntegration = useUpdateIntegration();
    const { data: dictionariesData, isLoading: dictionariesLoading, isError: dictionariesError, refetch: refetchDictionaries, } = useDictionaries();
    const [syncDialogOpen, setSyncDialogOpen] = (0, react_1.useState)(false);
    const [integrationDialog, setIntegrationDialog] = (0, react_1.useState)(null);
    const openIntegrationDialog = (i) => {
        setIntegrationDialog({
            id: i.id,
            open: true,
            baseUrl: i.baseUrl ?? '',
            secret: '',
            notes: i.notes ?? '',
        });
    };
    const [ldapDialog, setLdapDialog] = (0, react_1.useState)(null);
    const openLdapDialog = (i) => {
        setLdapDialog({
            id: i.id,
            open: true,
            host: i.baseUrl?.split(':')[0] ?? '',
            port: i.baseUrl?.split(':')[1] || '389',
            baseDn: '',
            bindDn: '',
            login: '',
            password: '',
            notes: i.notes ?? '',
        });
    };
    const handleIntegrationSave = () => {
        if (!integrationDialog)
            return;
        const { id, baseUrl, secret, notes } = integrationDialog;
        const payload = { id };
        if (baseUrl.trim())
            payload.baseUrl = baseUrl.trim();
        if (secret.trim())
            payload.secret = secret.trim();
        if (notes.trim())
            payload.notes = notes.trim();
        updateIntegration.mutate(payload);
        setIntegrationDialog(null);
    };
    const handleLdapSave = () => {
        if (!ldapDialog)
            return;
        const { id, host, port, baseDn, bindDn, login, password, notes } = ldapDialog;
        const payload = { id };
        const baseUrl = `${host.trim()}:${port.trim() || '389'}`;
        payload.baseUrl = baseUrl;
        if (login.trim())
            payload.login = login.trim();
        if (password.trim())
            payload.password = password.trim();
        if (baseDn.trim())
            payload.baseDn = baseDn.trim();
        if (bindDn.trim())
            payload.bindDn = bindDn.trim();
        if (notes.trim())
            payload.notes = notes.trim();
        updateIntegration.mutate(payload);
        setLdapDialog(null);
    };
    const reSync = async (i) => {
        try {
            if (i.id === 'ldap') {
                toast({ title: 'LDAP / AD', description: 'Проверка соединения с LDAP...' });
                return;
            }
            const resp = await fetch('/api/youtrack/test-connection', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + (0, auth_1.getAccessToken)() },
            });
            const data = await resp.json();
            const result = data.data || data;
            if (result.success) {
                toast({ title: `Проверка соединения · ${i.name}`, description: 'Соединение установлено.' });
            }
            else {
                toast({
                    title: `Ошибка · ${i.name}`,
                    description: result.message || 'Не удалось подключиться',
                    variant: 'destructive',
                });
            }
        }
        catch (e) {
            toast({
                title: `Ошибка · ${i.name}`,
                description: 'Сервер недоступен',
                variant: 'destructive',
            });
        }
    };
    const forceSync = () => {
        setSyncDialogOpen(true);
    };
    const ldapForceSync = () => {
        toast({ title: 'LDAP / AD', description: 'Синхронизация LDAP пока не реализована.' });
    };
    return (<>
      <PageHeader_1.PageHeader title="Настройки системы" description="Параметры расчёта спринта, внешние интеграции и справочники СПО (ТЗ §8)." breadcrumbs={[{ label: 'Главная' }, { label: 'Администрирование' }, { label: 'Настройки' }]} actions={<badge_1.Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-muted">
            <lucide_react_1.Settings className="h-3 w-3 mr-1"/> Доступно роли «Администратор»
          </badge_1.Badge>}/>

      <div className="p-4 space-y-3">
        <tabs_1.Tabs defaultValue="sprint" className="space-y-3">
          <tabs_1.TabsList>
            <tabs_1.TabsTrigger value="sprint">
              <lucide_react_1.Workflow className="h-3.5 w-3.5 mr-1"/> Параметры спринта
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="integrations">
              <lucide_react_1.Plug className="h-3.5 w-3.5 mr-1"/> Интеграции
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="refs">
              <lucide_react_1.Database className="h-3.5 w-3.5 mr-1"/> Справочники
            </tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          
          <tabs_1.TabsContent value="sprint" className="space-y-3">
            {planningLoading ? (<LoadingBlock text="Загрузка конфигураций спринтов..."/>) : planningError ? (<ErrorBlock message="Не удалось загрузить конфигурации спринтов." onRetry={() => refetchPlanning()}/>) : (<>
                
                {editMode === 'none' && (<button_1.Button size="sm" variant="outline" onClick={openCreate} className="h-8 text-xs">
                    <lucide_react_1.Plus className="h-3.5 w-3.5 mr-1"/> Добавить спринт
                  </button_1.Button>)}

                
                {editMode !== 'none' && (<div className="bg-card border border-border rounded-md shadow-card">
                    <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                      <h2 className="text-xs font-semibold">
                        {editMode === 'create'
                    ? 'Новая конфигурация спринта'
                    : 'Редактирование спринта'}
                      </h2>
                      <button_1.Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={closeForm} disabled={isSaving}>
                        <lucide_react_1.X className="h-4 w-4"/>
                      </button_1.Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      <Field label="Рабочих часов в месяце">
                        <input_1.Input type="number" className="h-8 text-xs" value={form.workHoursPerMonth} onChange={(e) => setF('workHoursPerMonth', Number(e.target.value))}/>
                      </Field>
                      <Field label="Месяц">
                        <select_1.Select value={String(form.month)} onValueChange={(v) => setF('month', Number(v))}>
                          <select_1.SelectTrigger className="h-8 text-xs">
                            <select_1.SelectValue placeholder="Выберите месяц"/>
                          </select_1.SelectTrigger>
                          <select_1.SelectContent>
                            {planning_1.MONTHS_RU.map((name, idx) => (<select_1.SelectItem key={idx + 1} value={String(idx + 1)}>
                                {name}
                              </select_1.SelectItem>))}
                          </select_1.SelectContent>
                        </select_1.Select>
                      </Field>
                      <Field label="Год" hint="2020–2100">
                        <input_1.Input type="number" className="h-8 text-xs" min={2020} max={2100} value={form.year} onChange={(e) => setF('year', Number(e.target.value))}/>
                      </Field>
                      <Field label="Резерв на внеплановые задачи, %" hint="Доля мощности, оставляемая на горящие задачи и техдолг.">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.reservePercent * 100)} onChange={(e) => setF('reservePercent', Number(e.target.value) / 100)}/>
                      </Field>
                      <Field label="% отладки от оценки" hint="Добавляется к оценке разработки. По умолчанию 30%.">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.debugPercent * 100)} onChange={(e) => setF('debugPercent', Number(e.target.value) / 100)}/>
                      </Field>
                      <Field label="% тестирования от оценки">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.testingPercent * 100)} onChange={(e) => setF('testingPercent', Number(e.target.value) / 100)}/>
                      </Field>
                      <Field label="% управления от оценки">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.managementPercent * 100)} onChange={(e) => setF('managementPercent', Number(e.target.value) / 100)}/>
                      </Field>
                      <Field label="Жёлтый порог загрузки, %">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.yellowThreshold * 100)} onChange={(e) => setF('yellowThreshold', Number(e.target.value) / 100)}/>
                      </Field>
                      <Field label="Красный порог загрузки, %">
                        <input_1.Input type="number" className="h-8 text-xs" value={Math.round(form.redThreshold * 100)} onChange={(e) => setF('redThreshold', Number(e.target.value) / 100)}/>
                      </Field>
                    </div>
                    <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {isSaving && 'Сохранение...'}
                      </span>
                      <div className="flex gap-2">
                        <button_1.Button size="sm" variant="outline" onClick={closeForm} disabled={isSaving} className="h-8 text-xs">
                          Отмена
                        </button_1.Button>
                        <button_1.Button size="sm" className="bg-primary hover:bg-primary-hover h-8 text-xs" onClick={handleSave} disabled={isSaving}>
                          {isSaving ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>) : (<lucide_react_1.Save className="h-4 w-4"/>)}{' '}
                          {editMode === 'create' ? 'Создать' : 'Сохранить'}
                        </button_1.Button>
                      </div>
                    </div>
                  </div>)}

                
                {(!planningList || planningList.length === 0) && editMode === 'none' ? (<div className="bg-card border border-border rounded-md shadow-card p-6 text-center text-muted-foreground">
                    <lucide_react_1.Workflow className="h-8 w-8 mx-auto mb-2"/>
                    <p className="text-sm">Нет конфигураций спринтов.</p>
                    <p className="text-xs mt-1">Нажмите «Добавить спринт», чтобы создать первую.</p>
                  </div>) : editMode === 'none' ? (<div className="space-y-2">
                    {planningList?.map((item) => (<div key={item.id} className="bg-card border border-border rounded-md shadow-card p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <lucide_react_1.Workflow className="h-4 w-4 text-primary shrink-0"/>
                            <span className="text-sm font-semibold text-foreground">
                              {sprintLabel(item)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.workHoursPerMonth != null
                        ? `${item.workHoursPerMonth} ч/мес · резерв ${Math.round((item.reservePercent ?? 0) * 100)}% · тест ${Math.round((item.testPercent ?? 0) * 100)}% · отл ${Math.round((item.debugPercent ?? 0) * 100)}% · упр ${Math.round((item.mgmtPercent ?? 0) * 100)}%`
                        : 'Нет данных'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Обновлено: {new Date(item.updatedAt).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button_1.Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)} title="Редактировать">
                            <lucide_react_1.Pencil className="h-3.5 w-3.5"/>
                          </button_1.Button>
                          <button_1.Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)} disabled={isSaving} title="Удалить">
                            <lucide_react_1.Trash2 className="h-3.5 w-3.5"/>
                          </button_1.Button>
                        </div>
                      </div>))}
                  </div>) : null}
              </>)}
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="integrations" className="space-y-3">
            {integrationsLoading ? (<LoadingBlock text="Загрузка списка интеграций..."/>) : integrationsError ? (<ErrorBlock message="Не удалось загрузить список интеграций. Проверьте соединение с сервером." onRetry={() => refetchIntegrations()}/>) : !integrationsData || integrationsData.length === 0 ? (<div className="bg-card border border-border rounded-md shadow-card p-6 text-center text-muted-foreground">
                <lucide_react_1.Plug className="h-8 w-8 mx-auto mb-2"/>
                <p className="text-sm">Нет настроенных интеграций.</p>
              </div>) : (<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {integrationsData.map((i) => {
                const isLdap = i.id === 'ldap';
                return (<IntegrationCard key={i.id} integration={i} onResync={() => reSync(i)} onForceSync={isLdap ? ldapForceSync : forceSync} onSave={isLdap ? () => openLdapDialog(i) : () => openIntegrationDialog(i)} dialog={isLdap
                        ? ldapDialog?.id === i.id
                            ? ldapDialog
                            : null
                        : integrationDialog?.id === i.id
                            ? integrationDialog
                            : null} onDialogChange={(updates) => isLdap
                        ? setLdapDialog((prev) => (prev ? { ...prev, ...updates } : null))
                        : setIntegrationDialog((prev) => (prev ? { ...prev, ...updates } : null))} onDialogSave={isLdap ? handleLdapSave : handleIntegrationSave} onDialogClose={isLdap ? () => setLdapDialog(null) : () => setIntegrationDialog(null)}/>);
            })}
              </div>)}
          </tabs_1.TabsContent>

          
          <tabs_1.TabsContent value="refs" className="space-y-3">
            {dictionariesLoading ? (<LoadingBlock text="Загрузка справочников..."/>) : dictionariesError ? (<ErrorBlock message="Не удалось загрузить справочники. Проверьте соединение с сервером." onRetry={() => refetchDictionaries()}/>) : (<DictionariesSection data={dictionariesData}/>)}
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </div>

      
      <SyncDialog_1.SyncDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}/>
    </>);
};
exports.default = Settings;
function Field({ label, hint, children, }) {
    return (<div className="space-y-1">
      <label_1.Label className="text-xs">{label}</label_1.Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>);
}
function StatusBadge({ status }) {
    const map = {
        connected: {
            cls: 'bg-success/15 text-success border-success/30',
            label: 'Подключено',
            icon: lucide_react_1.CheckCircle2,
        },
        error: {
            cls: 'bg-destructive/15 text-destructive border-destructive/30',
            label: 'Ошибка',
            icon: lucide_react_1.AlertCircle,
        },
        disconnected: {
            cls: 'bg-muted text-muted-foreground border-border',
            label: 'Отключено',
            icon: lucide_react_1.AlertCircle,
        },
    };
    const m = map[status] ?? map.disconnected;
    const Icon = m.icon;
    return (<badge_1.Badge variant="outline" className={(0, utils_1.cn)('font-normal text-[10px] py-0 h-4 px-1.5 inline-flex items-center gap-1', m.cls)}>
      <Icon className="h-3 w-3"/>
      {m.label}
    </badge_1.Badge>);
}
function Row({ label, value }) {
    return (<div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-40 shrink-0">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>);
}
function IntegrationCard({ integration, onResync, onForceSync, onSave, dialog, onDialogChange, onDialogSave, onDialogClose, }) {
    const [enabled, setEnabled] = (0, react_1.useState)(integration.status !== 'disconnected');
    return (<div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-2 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
            <StatusBadge status={integration.status}/>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{integration.description}</p>
        </div>
        <switch_1.Switch checked={enabled} onCheckedChange={setEnabled}/>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-xs">
        {integration.baseUrl && (<Row label="URL" value={<span className="font-mono text-[11px]">{integration.baseUrl}</span>}/>)}
        {integration.secretMask && (<Row label="Учётные данные" value={<span className="font-mono text-[11px]">{integration.secretMask}</span>}/>)}
        {integration.lastSyncAt && (<Row label="Последняя синхронизация" value={fmtDateTime(integration.lastSyncAt)}/>)}
        {integration.notes && (<div className="flex items-start gap-1.5 mt-2 p-2 rounded-sm bg-destructive/5 border border-destructive/20 text-[11px] text-destructive">
            <lucide_react_1.AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5"/>
            <span>{integration.notes}</span>
          </div>)}
      </div>
      <div className="px-3 py-2 border-t border-border flex flex-wrap justify-end gap-2">
        <button_1.Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onResync} disabled={!enabled}>
          <lucide_react_1.RefreshCw className="h-3.5 w-3.5"/> Проверить соединение
        </button_1.Button>
        <button_1.Button size="sm" className="h-7 text-[11px] bg-primary hover:bg-primary-hover" onClick={onForceSync} disabled={!enabled}>
          <lucide_react_1.Zap className="h-3.5 w-3.5"/> Синхронизировать сейчас
        </button_1.Button>
        <button_1.Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onSave}>
          <lucide_react_1.Settings className="h-3.5 w-3.5"/> Настройки
        </button_1.Button>
      </div>

      
      {dialog && (<dialog_1.Dialog open={dialog.open} onOpenChange={(open) => !open && onDialogClose()}>
          <dialog_1.DialogContent className="max-w-md">
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>Настройки интеграции · {integration.name}</dialog_1.DialogTitle>
              <dialog_1.DialogDescription className="text-xs">
                {integration.id === 'ldap'
                ? 'Параметры подключения к LDAP / AD. Логин и пароль для bind-пользователя.'
                : 'Параметры подключения к внешней системе. Секрет хранится в зашифрованном виде, отображается только маска.'}
              </dialog_1.DialogDescription>
            </dialog_1.DialogHeader>
            <div className="space-y-3">
              {integration.id === 'ldap' ? (<>
                  <Field label="Host">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.host ?? ''} onChange={(e) => onDialogChange({ host: e.target.value })} placeholder="ldap.company.com"/>
                  </Field>
                  <Field label="Port">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.port ?? '389'} onChange={(e) => onDialogChange({ port: e.target.value })} placeholder="389"/>
                  </Field>
                  <Field label="Base DN">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.baseDn ?? ''} onChange={(e) => onDialogChange({ baseDn: e.target.value })} placeholder="OU=Users,DC=company,DC=com"/>
                  </Field>
                  <Field label="Bind DN">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.bindDn ?? ''} onChange={(e) => onDialogChange({ bindDn: e.target.value })} placeholder="CN=bind-user,OU=Users,DC=company,DC=com"/>
                  </Field>
                  <Field label="Логин">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.login ?? ''} onChange={(e) => onDialogChange({ login: e.target.value })} placeholder="bind-user"/>
                  </Field>
                  <Field label="Пароль" hint={integration.secretMask
                    ? 'Текущий пароль задан. Оставьте пустым, чтобы не менять.'
                    : 'Пароль bind-пользователя LDAP.'}>
                    <input_1.Input type="password" className="h-8 text-xs font-mono" value={dialog.password ?? ''} onChange={(e) => onDialogChange({ password: e.target.value })} placeholder="••••••••"/>
                  </Field>
                  <Field label="Примечания">
                    <textarea_1.Textarea className="text-xs min-h-16" value={dialog.notes} onChange={(e) => onDialogChange({ notes: e.target.value })} placeholder="Например: контакт ответственного администратора."/>
                  </Field>
                </>) : (<>
                  <Field label="URL подключения">
                    <input_1.Input className="h-8 text-xs font-mono" value={dialog.baseUrl} onChange={(e) => onDialogChange({ baseUrl: e.target.value })} placeholder="https://..."/>
                  </Field>
                  <Field label="Новый секрет / токен" hint={integration.secretMask
                    ? `Текущий: ${integration.secretMask}. Оставьте пустым, чтобы не менять.`
                    : 'Будет сохранён в виде маски.'}>
                    <input_1.Input type="password" className="h-8 text-xs font-mono" value={dialog.secret ?? ''} onChange={(e) => onDialogChange({ secret: e.target.value })} placeholder="••••••••"/>
                  </Field>
                  <Field label="Примечания">
                    <textarea_1.Textarea className="text-xs min-h-16" value={dialog.notes} onChange={(e) => onDialogChange({ notes: e.target.value })} placeholder="Например: контакт ответственного администратора."/>
                  </Field>
                </>)}
            </div>
            <dialog_1.DialogFooter>
              <button_1.Button variant="outline" size="sm" onClick={onDialogClose}>
                Отмена
              </button_1.Button>
              <button_1.Button size="sm" className="bg-primary hover:bg-primary-hover" onClick={onDialogSave}>
                <lucide_react_1.Save className="h-4 w-4"/> Сохранить
              </button_1.Button>
            </dialog_1.DialogFooter>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>)}
    </div>);
}
function DictionariesSection({ data }) {
    return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <RefCard icon={lucide_react_1.Layers} title="Системы" description="Бизнес-домены и подсистемы, к которым относятся задачи. Локальный справочник СПО." source="local" items={data.systems.map((s) => ({ primary: s.name }))}/>
      <RefCard icon={lucide_react_1.Workflow} title="Рабочие роли" description="Используются в планировании и расчёте мощности направления. Локальный справочник СПО." source="local" items={data.workRoles.map((r) => ({ primary: r.label, secondary: r.id }))}/>
      <RefCard icon={lucide_react_1.Briefcase} title="Проекты" description="Источник: YouTrack. Изменения вносятся на стороне внешней системы и приходят при синхронизации." source="external" items={data.projects.map((p) => ({
            primary: p.name,
            secondary: p.shortName,
        }))}/>
      <RefCard icon={lucide_react_1.Database} title="Типы трудозатрат" description="Категории строк в табелях. Локальный справочник СПО." source="local" items={data.evaluationScales?.length
            ? data.evaluationScales.map((s) => ({ primary: s }))
            : [
                { primary: 'Разработка' },
                { primary: 'Отладка' },
                { primary: 'Тестирование' },
                { primary: 'Управление' },
            ]}/>
    </div>);
}
function RefCard({ icon: Icon, title, description, source, items, }) {
    const { toast } = (0, use_toast_1.useToast)();
    const isExternal = source === 'external';
    const onEdit = (idx) => {
        toast({
            title: 'Редактирование справочника',
            description: `«${items[idx].primary}» — форма редактирования (демо).`,
        });
    };
    const onDelete = (idx) => {
        toast({
            title: 'Удаление записи',
            description: `«${items[idx].primary}» — будет удалено после подтверждения (демо).`,
        });
    };
    const onAdd = () => {
        toast({
            title: `Новая запись · ${title}`,
            description: 'Форма добавления (демо).',
        });
    };
    return (<div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-2 border-b border-border flex items-start gap-2">
        <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5"/>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
            {items.length}
          </badge_1.Badge>
          {isExternal ? (<badge_1.Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5 bg-muted text-muted-foreground inline-flex items-center gap-1" title="Справочник синхронизируется из внешней системы — редактирование заблокировано">
              <lucide_react_1.Lock className="h-3 w-3"/> read-only
            </badge_1.Badge>) : (<button_1.Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onAdd}>
              <lucide_react_1.Plus className="h-3 w-3"/> Добавить
            </button_1.Button>)}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((it, i) => (<li key={i} className="px-3 py-1.5 text-xs flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-foreground truncate">{it.primary}</span>
              {it.secondary && (<span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {it.secondary}
                </span>)}
            </div>
            {!isExternal && (<div className="flex items-center gap-1 shrink-0">
                <button_1.Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEdit(i)} title="Редактировать">
                  <lucide_react_1.Pencil className="h-3 w-3"/>
                </button_1.Button>
                <button_1.Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(i)} title="Удалить">
                  <lucide_react_1.Trash2 className="h-3 w-3"/>
                </button_1.Button>
              </div>)}
          </li>))}
      </ul>
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
//# sourceMappingURL=Settings.js.map