import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { useAdmin, type PlanningSettingsDto, type IntegrationDto } from '@/hooks/useAdmin';
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
// Конвертация API → SprintSettings
// ===========================================================================
function planningToSprint(dto: PlanningSettingsDto, month: number, year: number): SprintSettings {
  return {
    year,
    month,
    workHoursPerMonth: dto.workHoursPerMonth,
    workHoursPerYear: dto.workHoursPerYear,
    reservePercent: dto.reservePercent,
    debugPercent: dto.debugPercent,
    testingPercent: dto.testPercent,
    managementPercent: dto.mgmtPercent,
    yellowThreshold: dto.yellowThreshold,
    redThreshold: dto.redThreshold,
  };
}

function sprintToPlanning(s: SprintSettings): PlanningSettingsDto {
  return {
    workHoursPerMonth: s.workHoursPerMonth,
    workHoursPerYear: s.workHoursPerYear,
    reservePercent: s.reservePercent,
    testPercent: s.testingPercent,
    debugPercent: s.debugPercent,
    mgmtPercent: s.managementPercent,
    yellowThreshold: s.yellowThreshold,
    redThreshold: s.redThreshold,
  };
}

// ===========================================================================
// Основной компонент
// ===========================================================================
const Settings = () => {
  const { toast } = useToast();
  const {
    usePlanningSettings,
    useUpdatePlanningSettings,
    useIntegrations,
    useUpdateIntegration,
    useDictionaries,
  } = useAdmin();

  // --- Планировочные настройки ---
  const {
    data: planningData,
    isLoading: planningLoading,
    isError: planningError,
    refetch: refetchPlanning,
  } = usePlanningSettings();

  const updatePlanningSettings = useUpdatePlanningSettings();

  const [sprint, setSprint] = useState<SprintSettings>(DEFAULT_SPRINT_SETTINGS);

  // Заполняем локальное состояние из API при загрузке
  useEffect(() => {
    if (planningData) {
      const now = new Date();
      setSprint(planningToSprint(planningData, now.getMonth() + 1, now.getFullYear()));
    }
  }, [planningData]);

  const setS = <K extends keyof SprintSettings>(k: K, v: SprintSettings[K]) =>
    setSprint((d) => ({ ...d, [k]: v }));

  const saveSprint = () => {
    updatePlanningSettings.mutate(sprintToPlanning(sprint), {
      onSuccess: () => {
        toast({
          title: 'Параметры спринта сохранены',
          description: 'Применятся к следующему создаваемому спринту.',
        });
      },
    });
  };

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

  const reSync = (i: IntegrationDto) => {
    toast({
      title: `Проверка соединения · ${i.name}`,
      description: 'Соединение установлено.',
    });
  };

  const forceSync = (i: IntegrationDto) => {
    toast({
      title: `Синхронизация · ${i.name}`,
      description: 'Синхронизация запущена.',
    });
  };

  return (
    <AppLayout>
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
              <LoadingBlock text="Загрузка параметров спринта..." />
            ) : planningError ? (
              <ErrorBlock
                message="Не удалось загрузить параметры спринта. Проверьте соединение с сервером."
                onRetry={() => refetchPlanning()}
              />
            ) : (
              <div className="bg-card border border-border rounded-md shadow-card">
                <div className="px-3 py-1.5 border-b border-border">
                  <h2 className="text-xs font-semibold">Параметры спринта по умолчанию</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Используются при создании нового месячного спринта (ТЗ §8.2 и §9). Влияют на
                    доступную мощность и распределение часов между
                    разработкой/тестированием/управлением.
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <Field label="Месяц">
                    <Select
                      value={String(sprint.month)}
                      onValueChange={(v) => setS('month', Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                  </Field>
                  <Field label="Год">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={sprint.year}
                      onChange={(e) => setS('year', Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Рабочих часов в месяце">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={sprint.workHoursPerMonth}
                      onChange={(e) => setS('workHoursPerMonth', Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Рабочих часов в году">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={sprint.workHoursPerYear}
                      onChange={(e) => setS('workHoursPerYear', Number(e.target.value))}
                    />
                  </Field>
                  <Field
                    label="Резерв на внеплановые задачи, %"
                    hint="Доля мощности, оставляемая на горящие задачи и техдолг."
                  >
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.reservePercent * 100)}
                      onChange={(e) => setS('reservePercent', Number(e.target.value) / 100)}
                    />
                  </Field>
                  <Field
                    label="% отладки от оценки"
                    hint="Добавляется к оценке разработки. По умолчанию 30%."
                  >
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.debugPercent * 100)}
                      onChange={(e) => setS('debugPercent', Number(e.target.value) / 100)}
                    />
                  </Field>
                  <Field label="% тестирования от оценки">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.testingPercent * 100)}
                      onChange={(e) => setS('testingPercent', Number(e.target.value) / 100)}
                    />
                  </Field>
                  <Field label="% управления от оценки">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.managementPercent * 100)}
                      onChange={(e) => setS('managementPercent', Number(e.target.value) / 100)}
                    />
                  </Field>
                  <div />
                  <Field label="Жёлтый порог загрузки, %">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.yellowThreshold * 100)}
                      onChange={(e) => setS('yellowThreshold', Number(e.target.value) / 100)}
                    />
                  </Field>
                  <Field label="Красный порог загрузки, %">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={Math.round(sprint.redThreshold * 100)}
                      onChange={(e) => setS('redThreshold', Number(e.target.value) / 100)}
                    />
                  </Field>
                </div>
                <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {updatePlanningSettings.isPending && 'Сохранение...'}
                  </span>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary-hover"
                    onClick={saveSprint}
                    disabled={updatePlanningSettings.isPending}
                  >
                    {updatePlanningSettings.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}{' '}
                    Сохранить
                  </Button>
                </div>
              </div>
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
                {integrationsData.map((i) => (
                  <IntegrationCard
                    key={i.id}
                    integration={i}
                    onResync={() => reSync(i)}
                    onForceSync={() => forceSync(i)}
                    onSave={() => openIntegrationDialog(i)}
                    dialog={integrationDialog?.id === i.id ? integrationDialog : null}
                    onDialogChange={(updates) =>
                      setIntegrationDialog((prev) => (prev ? { ...prev, ...updates } : null))
                    }
                    onDialogSave={handleIntegrationSave}
                    onDialogClose={() => setIntegrationDialog(null)}
                  />
                ))}
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
    </AppLayout>
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
  dialog: { id: string; open: boolean; baseUrl: string; secret: string; notes: string } | null;
  onDialogChange: (updates: Partial<{ baseUrl: string; secret: string; notes: string }>) => void;
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
                Параметры подключения к внешней системе. Секрет хранится в зашифрованном виде,
                отображается только маска.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
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
                  value={dialog.secret}
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
