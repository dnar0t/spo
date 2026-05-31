import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Database,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Trash2,
  Workflow,
  Zap,
  X,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';
import {
  useAdmin,
  type PlanningSettingsDto,
  type PlanningSettingsListItemDto,
  type IntegrationDto,
} from '@/hooks/useAdmin';
import { SyncDialog } from '@/components/SyncDialog';
import { DEFAULT_SPRINT_SETTINGS, MONTHS_RU, type SprintSettings } from '@/lib/planning';
import type { AdminDictionariesDto } from '@/hooks/useAdmin';

// ---------------------------------------------------------------------------
// Компонент загрузки
// ---------------------------------------------------------------------------
function LoadingBlock({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Компонент ошибки
// ---------------------------------------------------------------------------
function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-destructive">
      <AlertCircle className="h-8 w-8" />
      <p className="text-sm text-center max-w-md">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Повторить
        </Button>
      )}
    </div>
  );
}

// ===========================================================================
// Вспомогательная: форматирование даты для метки спринта
// ===========================================================================
function sprintLabel(d: Pick<PlanningSettingsListItemDto, 'createdAt' | 'month' | 'year'>): string {
  const month = d.month;
  const year = d.year;
  if (month != null && year != null && month >= 1 && month <= 12) {
    return `${MONTHS_RU[month - 1]} ${year}`;
  }
  try {
    const dt = new Date(d.createdAt);
    const m = MONTHS_RU[dt.getMonth()];
    return `${m} ${dt.getFullYear()}`;
  } catch {
    return '—';
  }
}

// ===========================================================================
// Конвертация: API элемент → форма редактирования
// ===========================================================================
interface SprintFormState {
  workHoursPerMonth: number;
  month: number;
  year: number;
  reservePercent: number;
  debugPercent: number;
  testingPercent: number;
  managementPercent: number;
  yellowThreshold: number;
  redThreshold: number;
}

function itemToForm(item: PlanningSettingsListItemDto): SprintFormState {
  return {
    workHoursPerMonth: item.workHoursPerMonth ?? DEFAULT_SPRINT_SETTINGS.workHoursPerMonth,
    month: item.month ?? DEFAULT_SPRINT_SETTINGS.month,
    year: item.year ?? DEFAULT_SPRINT_SETTINGS.year,
    reservePercent: item.reservePercent ?? DEFAULT_SPRINT_SETTINGS.reservePercent,
    debugPercent: item.debugPercent ?? DEFAULT_SPRINT_SETTINGS.debugPercent,
    testingPercent: item.testPercent ?? DEFAULT_SPRINT_SETTINGS.testingPercent,
    managementPercent: item.mgmtPercent ?? DEFAULT_SPRINT_SETTINGS.managementPercent,
    yellowThreshold: item.yellowThreshold ?? DEFAULT_SPRINT_SETTINGS.yellowThreshold,
    redThreshold: item.redThreshold ?? DEFAULT_SPRINT_SETTINGS.redThreshold,
  };
}

function defaultValueForm(): SprintFormState {
  return {
    workHoursPerMonth: DEFAULT_SPRINT_SETTINGS.workHoursPerMonth,
    month: DEFAULT_SPRINT_SETTINGS.month,
    year: DEFAULT_SPRINT_SETTINGS.year,
    reservePercent: DEFAULT_SPRINT_SETTINGS.reservePercent,
    debugPercent: DEFAULT_SPRINT_SETTINGS.debugPercent,
    testingPercent: DEFAULT_SPRINT_SETTINGS.testingPercent,
    managementPercent: DEFAULT_SPRINT_SETTINGS.managementPercent,
    yellowThreshold: DEFAULT_SPRINT_SETTINGS.yellowThreshold,
    redThreshold: DEFAULT_SPRINT_SETTINGS.redThreshold,
  };
}

function formToDto(f: SprintFormState): PlanningSettingsDto {
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

// ===========================================================================
// Основной компонент
// ===========================================================================
type EditMode = 'none' | 'create' | 'edit';

const Settings = () => {
  const { toast } = useToast();
  const {
    useListPlanningSettings,
    useCreatePlanningSettings,
    useUpdatePlanningSettings,
    useDeletePlanningSettings,
    useIntegrations,
    useUpdateIntegration,
    useDictionaries,
  } = useAdmin();

  // --- Планировочные настройки (список) ---
  const {
    data: planningList,
    isLoading: planningLoading,
    isError: planningError,
    refetch: refetchPlanning,
  } = useListPlanningSettings();

  const createSprint = useCreatePlanningSettings();
  const updateSprint = useUpdatePlanningSettings();
  const deleteSprint = useDeletePlanningSettings();

  // --- Состояние редактирования ---
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SprintFormState>(defaultValueForm());

  const openCreate = () => {
    setEditMode('create');
    setEditId(null);
    setForm(defaultValueForm());
  };

  const openEdit = (item: PlanningSettingsListItemDto) => {
    setEditMode('edit');
    setEditId(item.id);
    setForm(itemToForm(item));
  };

  const closeForm = () => {
    setEditMode('none');
    setEditId(null);
  };

  const setF = <K extends keyof SprintFormState>(k: K, v: SprintFormState[K]) =>
    setForm((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    if (editMode === 'create') {
      createSprint.mutate(formToDto(form), {
        onSuccess: () => {
          closeForm();
        },
      });
    } else if (editMode === 'edit' && editId) {
      updateSprint.mutate(
        { id: editId, ...formToDto(form) },
        {
          onSuccess: () => {
            closeForm();
          },
        },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить эту конфигурацию спринта?')) {
      deleteSprint.mutate(id, {
        onSuccess: () => {
          if (editId === id) closeForm();
        },
      });
    }
  };

  const isSaving = createSprint.isPending || updateSprint.isPending || deleteSprint.isPending;

  // --- Интеграции ---
  const {
    data: integrationsData,
    isLoading: integrationsLoading,
    isError: integrationsError,
    refetch: refetchIntegrations,
  } = useIntegrations();

  const updateIntegration = useUpdateIntegration();

  // --- Справочники ---
  const {
    data: dictionariesData,
    isLoading: dictionariesLoading,
    isError: dictionariesError,
    refetch: refetchDictionaries,
  } = useDictionaries();

  // --- Состояние диалога синхронизации ---
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // --- Локальные состояния для диалогов интеграций ---
  const [integrationDialog, setIntegrationDialog] = useState<{
    id: string;
    open: boolean;
    baseUrl: string;
    secret: string;
    notes: string;
  } | null>(null);

  const openIntegrationDialog = (i: IntegrationDto) => {
    setIntegrationDialog({
      id: i.id,
      open: true,
      baseUrl: i.baseUrl ?? '',
      secret: '',
      notes: i.notes ?? '',
    });
  };

  // Состояние диалога LDAP (дополнительные поля)
  const [ldapDialog, setLdapDialog] = useState<{
    id: string;
    open: boolean;
    host: string;
    port: string;
    baseDn: string;
    bindDn: string;
    login: string;
    password: string;
    notes: string;
  } | null>(null);

  const openLdapDialog = (i: IntegrationDto) => {
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
    if (!integrationDialog) return;
    const { id, baseUrl, secret, notes } = integrationDialog;
    const payload: { id: string; baseUrl?: string; secret?: string; notes?: string } = { id };
    if (baseUrl.trim()) payload.baseUrl = baseUrl.trim();
    if (secret.trim()) payload.secret = secret.trim();
    if (notes.trim()) payload.notes = notes.trim();
    updateIntegration.mutate(payload);
    setIntegrationDialog(null);
  };

  const handleLdapSave = () => {
    if (!ldapDialog) return;
    const { id, host, port, baseDn, bindDn, login, password, notes } = ldapDialog;
    const payload: {
      id: string;
      baseUrl?: string;
      login?: string;
      password?: string;
      baseDn?: string;
      bindDn?: string;
      notes?: string;
    } = { id };
    const baseUrl = `${host.trim()}:${port.trim() || '389'}`;
    payload.baseUrl = baseUrl;
    if (login.trim()) payload.login = login.trim();
    if (password.trim()) payload.password = password.trim();
    if (baseDn.trim()) payload.baseDn = baseDn.trim();
    if (bindDn.trim()) payload.bindDn = bindDn.trim();
    if (notes.trim()) payload.notes = notes.trim();
    updateIntegration.mutate(payload as any);
    setLdapDialog(null);
  };

  const reSync = async (i: IntegrationDto) => {
    try {
      if (i.id === 'ldap') {
        toast({ title: 'LDAP / AD', description: 'Проверка соединения с LDAP...' });
        return;
      }
      const resp = await fetch('/api/youtrack/test-connection', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getAccessToken() },
      });
      const data = await resp.json();
      // Ответ может быть как { success, data: {...} }, так и { success, message, details }
      const result = data.data || data;
      if (result.success) {
        toast({ title: `Проверка соединения · ${i.name}`, description: 'Соединение установлено.' });
      } else {
        toast({
          title: `Ошибка · ${i.name}`,
          description: result.message || 'Не удалось подключиться',
          variant: 'destructive',
        });
      }
    } catch (e) {
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

  return (
    <>
      <PageHeader
        title="Настройки системы"
        description="Параметры расчёта спринта, внешние интеграции и справочники СПО (ТЗ §8)."
        breadcrumbs={[{ label: 'Главная' }, { label: 'Администрирование' }, { label: 'Настройки' }]}
        actions={
          <Badge variant="outline" className="text-[10px] py-0 h-5 px-1.5 bg-muted">
            <SettingsIcon className="h-3 w-3 mr-1" /> Доступно роли «Администратор»
          </Badge>
        }
      />

      <div className="p-4 space-y-3">
        <Tabs defaultValue="sprint" className="space-y-3">
          <TabsList>
            <TabsTrigger value="sprint">
              <Workflow className="h-3.5 w-3.5 mr-1" /> Параметры спринта
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Plug className="h-3.5 w-3.5 mr-1" /> Интеграции
            </TabsTrigger>
            <TabsTrigger value="refs">
              <Database className="h-3.5 w-3.5 mr-1" /> Справочники
            </TabsTrigger>
          </TabsList>

          {/* ========== Параметры спринта ========== */}
          <TabsContent value="sprint" className="space-y-3">
            {planningLoading ? (
              <LoadingBlock text="Загрузка конфигураций спринтов..." />
            ) : planningError ? (
              <ErrorBlock
                message="Не удалось загрузить конфигурации спринтов."
                onRetry={() => refetchPlanning()}
              />
            ) : (
              <>
                {/* Кнопка добавления */}
                {editMode === 'none' && (
                  <Button size="sm" variant="outline" onClick={openCreate} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Добавить спринт
                  </Button>
                )}

                {/* Форма создания/редактирования */}
                {editMode !== 'none' && (
                  <div className="bg-card border border-border rounded-md shadow-card">
                    <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
                      <h2 className="text-xs font-semibold">
                        {editMode === 'create'
                          ? 'Новая конфигурация спринта'
                          : 'Редактирование спринта'}
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={closeForm}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                      <Field label="Рабочих часов в месяце">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={form.workHoursPerMonth}
                          onChange={(e) => setF('workHoursPerMonth', Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Месяц">
                        <Select
                          value={String(form.month)}
                          onValueChange={(v) => setF('month', Number(v))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Выберите месяц" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_RU.map((name, idx) => (
                              <SelectItem key={idx + 1} value={String(idx + 1)}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Год" hint="2020–2100">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          min={2020}
                          max={2100}
                          value={form.year}
                          onChange={(e) => setF('year', Number(e.target.value))}
                        />
                      </Field>
                      <Field
                        label="Резерв на внеплановые задачи, %"
                        hint="Доля мощности, оставляемая на горящие задачи и техдолг."
                      >
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.reservePercent * 100)}
                          onChange={(e) => setF('reservePercent', Number(e.target.value) / 100)}
                        />
                      </Field>
                      <Field
                        label="% отладки от оценки"
                        hint="Добавляется к оценке разработки. По умолчанию 30%."
                      >
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.debugPercent * 100)}
                          onChange={(e) => setF('debugPercent', Number(e.target.value) / 100)}
                        />
                      </Field>
                      <Field label="% тестирования от оценки">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.testingPercent * 100)}
                          onChange={(e) => setF('testingPercent', Number(e.target.value) / 100)}
                        />
                      </Field>
                      <Field label="% управления от оценки">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.managementPercent * 100)}
                          onChange={(e) => setF('managementPercent', Number(e.target.value) / 100)}
                        />
                      </Field>
                      <Field label="Жёлтый порог загрузки, %">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.yellowThreshold * 100)}
                          onChange={(e) => setF('yellowThreshold', Number(e.target.value) / 100)}
                        />
                      </Field>
                      <Field label="Красный порог загрузки, %">
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={Math.round(form.redThreshold * 100)}
                          onChange={(e) => setF('redThreshold', Number(e.target.value) / 100)}
                        />
                      </Field>
                    </div>
                    <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {isSaving && 'Сохранение...'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={closeForm}
                          disabled={isSaving}
                          className="h-8 text-xs"
                        >
                          Отмена
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary-hover h-8 text-xs"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}{' '}
                          {editMode === 'create' ? 'Создать' : 'Сохранить'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Список конфигураций */}
                {(!planningList || planningList.length === 0) && editMode === 'none' ? (
                  <div className="bg-card border border-border rounded-md shadow-card p-6 text-center text-muted-foreground">
                    <Workflow className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Нет конфигураций спринтов.</p>
                    <p className="text-xs mt-1">Нажмите «Добавить спринт», чтобы создать первую.</p>
                  </div>
                ) : editMode === 'none' ? (
                  <div className="space-y-2">
                    {planningList?.map((item) => (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-md shadow-card p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Workflow className="h-4 w-4 text-primary shrink-0" />
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(item)}
                            title="Редактировать"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                            disabled={isSaving}
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>

          {/* ========== Интеграции ========== */}
          <TabsContent value="integrations" className="space-y-3">
            {integrationsLoading ? (
              <LoadingBlock text="Загрузка списка интеграций..." />
            ) : integrationsError ? (
              <ErrorBlock
                message="Не удалось загрузить список интеграций. Проверьте соединение с сервером."
                onRetry={() => refetchIntegrations()}
              />
            ) : !integrationsData || integrationsData.length === 0 ? (
              <div className="bg-card border border-border rounded-md shadow-card p-6 text-center text-muted-foreground">
                <Plug className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Нет настроенных интеграций.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {integrationsData.map((i) => {
                  const isLdap = i.id === 'ldap';
                  return (
                    <IntegrationCard
                      key={i.id}
                      integration={i}
                      onResync={() => reSync(i)}
                      onForceSync={isLdap ? ldapForceSync : forceSync}
                      onSave={isLdap ? () => openLdapDialog(i) : () => openIntegrationDialog(i)}
                      dialog={
                        isLdap
                          ? ldapDialog?.id === i.id
                            ? ldapDialog
                            : null
                          : integrationDialog?.id === i.id
                            ? integrationDialog
                            : null
                      }
                      onDialogChange={(updates) =>
                        isLdap
                          ? setLdapDialog((prev) => (prev ? { ...prev, ...updates } : null))
                          : setIntegrationDialog((prev) => (prev ? { ...prev, ...updates } : null))
                      }
                      onDialogSave={isLdap ? handleLdapSave : handleIntegrationSave}
                      onDialogClose={
                        isLdap ? () => setLdapDialog(null) : () => setIntegrationDialog(null)
                      }
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========== Справочники ========== */}
          <TabsContent value="refs" className="space-y-3">
            {dictionariesLoading ? (
              <LoadingBlock text="Загрузка справочников..." />
            ) : dictionariesError ? (
              <ErrorBlock
                message="Не удалось загрузить справочники. Проверьте соединение с сервером."
                onRetry={() => refetchDictionaries()}
              />
            ) : (
              <DictionariesSection data={dictionariesData!} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Диалог синхронизации с YouTrack */}
      <SyncDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen} />
    </>
  );
};

export default Settings;

// ===========================================================================
// Поле ввода
// ===========================================================================
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ===========================================================================
// Статусный бейдж
// ===========================================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; icon: typeof CheckCircle2 }> = {
    connected: {
      cls: 'bg-success/15 text-success border-success/30',
      label: 'Подключено',
      icon: CheckCircle2,
    },
    error: {
      cls: 'bg-destructive/15 text-destructive border-destructive/30',
      label: 'Ошибка',
      icon: AlertCircle,
    },
    disconnected: {
      cls: 'bg-muted text-muted-foreground border-border',
      label: 'Отключено',
      icon: AlertCircle,
    },
  };
  const m = map[status] ?? map.disconnected;
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal text-[10px] py-0 h-4 px-1.5 inline-flex items-center gap-1',
        m.cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

// ===========================================================================
// Строка "ключ: значение"
// ===========================================================================
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-40 shrink-0">
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

// ===========================================================================
// Карточка интеграции
// ===========================================================================
function IntegrationCard({
  integration,
  onResync,
  onForceSync,
  onSave,
  dialog,
  onDialogChange,
  onDialogSave,
  onDialogClose,
}: {
  integration: IntegrationDto;
  onResync: () => void;
  onForceSync: () => void;
  onSave: () => void;
  dialog: {
    id: string;
    open: boolean;
    baseUrl: string;
    secret?: string;
    login?: string;
    password?: string;
    notes: string;
    host?: string;
    port?: string;
    baseDn?: string;
    bindDn?: string;
  } | null;
  onDialogChange: (updates: Record<string, string>) => void;
  onDialogSave: () => void;
  onDialogClose: () => void;
}) {
  const [enabled, setEnabled] = useState(integration.status !== 'disconnected');

  return (
    <div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-2 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
            <StatusBadge status={integration.status} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{integration.description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="px-3 py-2 space-y-1.5 text-xs">
        {integration.baseUrl && (
          <Row
            label="URL"
            value={<span className="font-mono text-[11px]">{integration.baseUrl}</span>}
          />
        )}
        {integration.secretMask && (
          <Row
            label="Учётные данные"
            value={<span className="font-mono text-[11px]">{integration.secretMask}</span>}
          />
        )}
        {integration.lastSyncAt && (
          <Row label="Последняя синхронизация" value={fmtDateTime(integration.lastSyncAt)} />
        )}
        {integration.notes && (
          <div className="flex items-start gap-1.5 mt-2 p-2 rounded-sm bg-destructive/5 border border-destructive/20 text-[11px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{integration.notes}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-border flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          onClick={onResync}
          disabled={!enabled}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Проверить соединение
        </Button>
        <Button
          size="sm"
          className="h-7 text-[11px] bg-primary hover:bg-primary-hover"
          onClick={onForceSync}
          disabled={!enabled}
        >
          <Zap className="h-3.5 w-3.5" /> Синхронизировать сейчас
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onSave}>
          <SettingsIcon className="h-3.5 w-3.5" /> Настройки
        </Button>
      </div>

      {/* Диалог настроек интеграции */}
      {dialog && (
        <Dialog open={dialog.open} onOpenChange={(open) => !open && onDialogClose()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Настройки интеграции · {integration.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {integration.id === 'ldap'
                  ? 'Параметры подключения к LDAP / AD. Логин и пароль для bind-пользователя.'
                  : 'Параметры подключения к внешней системе. Секрет хранится в зашифрованном виде, отображается только маска.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {integration.id === 'ldap' ? (
                <>
                  <Field label="Host">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.host ?? ''}
                      onChange={(e) => onDialogChange({ host: e.target.value })}
                      placeholder="ldap.company.com"
                    />
                  </Field>
                  <Field label="Port">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.port ?? '389'}
                      onChange={(e) => onDialogChange({ port: e.target.value })}
                      placeholder="389"
                    />
                  </Field>
                  <Field label="Base DN">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.baseDn ?? ''}
                      onChange={(e) => onDialogChange({ baseDn: e.target.value })}
                      placeholder="OU=Users,DC=company,DC=com"
                    />
                  </Field>
                  <Field label="Bind DN">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.bindDn ?? ''}
                      onChange={(e) => onDialogChange({ bindDn: e.target.value })}
                      placeholder="CN=bind-user,OU=Users,DC=company,DC=com"
                    />
                  </Field>
                  <Field label="Логин">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.login ?? ''}
                      onChange={(e) => onDialogChange({ login: e.target.value })}
                      placeholder="bind-user"
                    />
                  </Field>
                  <Field
                    label="Пароль"
                    hint={
                      integration.secretMask
                        ? 'Текущий пароль задан. Оставьте пустым, чтобы не менять.'
                        : 'Пароль bind-пользователя LDAP.'
                    }
                  >
                    <Input
                      type="password"
                      className="h-8 text-xs font-mono"
                      value={dialog.password ?? ''}
                      onChange={(e) => onDialogChange({ password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </Field>
                  <Field label="Примечания">
                    <Textarea
                      className="text-xs min-h-16"
                      value={dialog.notes}
                      onChange={(e) => onDialogChange({ notes: e.target.value })}
                      placeholder="Например: контакт ответственного администратора."
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="URL подключения">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={dialog.baseUrl}
                      onChange={(e) => onDialogChange({ baseUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field
                    label="Новый секрет / токен"
                    hint={
                      integration.secretMask
                        ? `Текущий: ${integration.secretMask}. Оставьте пустым, чтобы не менять.`
                        : 'Будет сохранён в виде маски.'
                    }
                  >
                    <Input
                      type="password"
                      className="h-8 text-xs font-mono"
                      value={dialog.secret ?? ''}
                      onChange={(e) => onDialogChange({ secret: e.target.value })}
                      placeholder="••••••••"
                    />
                  </Field>
                  <Field label="Примечания">
                    <Textarea
                      className="text-xs min-h-16"
                      value={dialog.notes}
                      onChange={(e) => onDialogChange({ notes: e.target.value })}
                      placeholder="Например: контакт ответственного администратора."
                    />
                  </Field>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onDialogClose}>
                Отмена
              </Button>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary-hover"
                onClick={onDialogSave}
              >
                <Save className="h-4 w-4" /> Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ===========================================================================
// Секция справочников
// ===========================================================================
function DictionariesSection({ data }: { data: AdminDictionariesDto }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <RefCard
        icon={Layers}
        title="Системы"
        description="Бизнес-домены и подсистемы, к которым относятся задачи. Локальный справочник СПО."
        source="local"
        items={data.systems.map((s) => ({ primary: s.name }))}
      />
      <RefCard
        icon={Workflow}
        title="Рабочие роли"
        description="Используются в планировании и расчёте мощности направления. Локальный справочник СПО."
        source="local"
        items={data.workRoles.map((r) => ({ primary: r.label, secondary: r.id }))}
      />
      <RefCard
        icon={Briefcase}
        title="Проекты"
        description="Источник: YouTrack. Изменения вносятся на стороне внешней системы и приходят при синхронизации."
        source="external"
        items={data.projects.map((p) => ({
          primary: p.name,
          secondary: p.shortName,
        }))}
      />
      <RefCard
        icon={Database}
        title="Типы трудозатрат"
        description="Категории строк в табелях. Локальный справочник СПО."
        source="local"
        items={
          data.evaluationScales?.length
            ? data.evaluationScales.map((s) => ({ primary: s }))
            : [
                { primary: 'Разработка' },
                { primary: 'Отладка' },
                { primary: 'Тестирование' },
                { primary: 'Управление' },
              ]
        }
      />
    </div>
  );
}

// ===========================================================================
// Карточка справочника
// ===========================================================================
type RefSource = 'local' | 'external';

function RefCard({
  icon: Icon,
  title,
  description,
  source,
  items,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  source: RefSource;
  items: { primary: string; secondary?: string }[];
}) {
  const { toast } = useToast();
  const isExternal = source === 'external';

  const onEdit = (idx: number) => {
    toast({
      title: 'Редактирование справочника',
      description: `«${items[idx].primary}» — форма редактирования (демо).`,
    });
  };

  const onDelete = (idx: number) => {
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

  return (
    <div className="bg-card border border-border rounded-md shadow-card">
      <div className="px-3 py-2 border-b border-border flex items-start gap-2">
        <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
            {items.length}
          </Badge>
          {isExternal ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-4 px-1.5 bg-muted text-muted-foreground inline-flex items-center gap-1"
              title="Справочник синхронизируется из внешней системы — редактирование заблокировано"
            >
              <Lock className="h-3 w-3" /> read-only
            </Badge>
          ) : (
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onAdd}>
              <Plus className="h-3 w-3" /> Добавить
            </Button>
          )}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((it, i) => (
          <li key={i} className="px-3 py-1.5 text-xs flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-foreground truncate">{it.primary}</span>
              {it.secondary && (
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {it.secondary}
                </span>
              )}
            </div>
            {!isExternal && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onEdit(i)}
                  title="Редактировать"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(i)}
                  title="Удалить"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ===========================================================================
// Форматирование даты
// ===========================================================================
function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
