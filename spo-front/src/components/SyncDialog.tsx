import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StageCounts {
  processed: number;
  changes: number;
  errors: number;
}

interface StageDetails {
  users: StageCounts | null;
  projects: StageCounts | null;
  issues: StageCounts | null;
  workItems: StageCounts | null;
}

interface SyncRunStatus {
  id: string;
  triggerType: string;
  status: string;
  totalIssues: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  errors?: Record<string, unknown> | null;
  currentStage: string | null;
  stageDetails: StageDetails | null;
  logs?: { level: string; message: string }[];
}

interface StageConfig {
  id: string;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  { id: 'users', label: 'Пользователи', description: 'Синхронизация пользователей' },
  { id: 'projects', label: 'Проекты', description: 'Синхронизация проектов' },
  { id: 'issues', label: 'Задачи', description: 'Синхронизация задач' },
  { id: 'workItems', label: 'Трудозатраты', description: 'Синхронизация трудозатрат' },
];

function getStageCounts(stageId: string, details: StageDetails | null): StageCounts | null {
  if (!details) return null;
  return details[stageId as keyof StageDetails] || null;
}

function formatStageResult(counts: StageCounts | null): string {
  if (!counts) return "";
  const parts: string[] = [];
  parts.push(`${counts.processed} обработано`);
  if (counts.changes > 0) parts.push(`${counts.changes} изменений`);
  if (counts.errors > 0) parts.push(`${counts.errors} ошибок`);
  return parts.join(", ");
}

function getStageIndex(currentStage: string | null): number {
  if (!currentStage) return -1;
  return STAGES.findIndex(s => s.id === currentStage);
}

export function SyncDialog({ open, onOpenChange }: SyncDialogProps) {
  const [syncRunId, setSyncRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncRunStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStageIdx = getStageIndex(status?.currentStage ?? null);
  const isDone = status?.status === 'SUCCESS' || status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED' || !!error;
  const isRunning = !isDone && !isFailed && !cancelled && syncRunId !== null;

  // Calculate overall progress (each stage = 25%, plus details within stages)
  const stageProgress = isDone ? 100 : isFailed ? 100 : (currentStageIdx >= 0 ? (currentStageIdx / STAGES.length) * 100 : 0);
  const totalProcessed = (status?.createdCount ?? 0) + (status?.updatedCount ?? 0);
  const totalErrors = status?.errorCount ?? 0;

  const startSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCancelled(false);
    setSyncRunId(null);
    setStatus(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Timeout for starting sync: 30 seconds
      const timeoutId = setTimeout(() => abort.abort(), 30000);
      const resp = await fetch('/api/youtrack/sync', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + getAccessToken(),
          'Content-Type': 'application/json',
        },
        signal: abort.signal,
      });
      clearTimeout(timeoutId);
      const json = await resp.json();
      const data = json.data || json;
      const runId = data?.syncRunId;
      if (!runId) {
        setError('Сервер не вернул ID синхронизации');
        setLoading(false);
        return;
      }
      setSyncRunId(runId);
      setLoading(false);

      // Start polling status every 2 seconds
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/youtrack/sync-runs/' + runId + '/status?_=' + Date.now(), {
            headers: { 'Cache-Control': 'no-cache' },
            signal: abort.signal,
          });
          if (r.ok) {
            const rs = await r.json();
            // Response can be { success: true, data: {...} } or direct {...}
            const st = rs.data || rs;
            if (st && st.status && st.status !== 'UNKNOWN' && st.status !== 'ERROR') {
              setStatus(st);
              if (st.status === 'SUCCESS' || st.status === 'COMPLETED' || st.status === 'FAILED' || st.status === 'PARTIAL') {
                if (pollingRef.current) clearInterval(pollingRef.current);
              }
            }
          }
        } catch (pollErr: any) {
          if (pollErr.name === 'AbortError') return;
        }
      }, 2000);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Сервер не отвечает. Проверьте, настроена ли интеграция с YouTrack.');
      } else {
        setError(e.message || 'Ошибка соединения с сервером.');
      }
      setStatus(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      startSync();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [open, startSync]);

  const handleCancel = () => {
    setCancelled(true);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (abortRef.current) abortRef.current.abort();
  };

  const handleClose = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (abortRef.current) abortRef.current.abort();
    onOpenChange(false);
  };

  const progressPercent = Math.min(100, Math.round(stageProgress + (isRunning && currentStageIdx >= 0 ? 5 : 0)));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isRunning) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
            Синхронизация с YouTrack
          </DialogTitle>
          <DialogDescription>
            {isDone
              ? 'Синхронизация успешно завершена.'
              : isFailed
                ? 'При синхронизации произошли ошибки.'
                : cancelled
                  ? 'Синхронизация отменена.'
                  : loading
                    ? 'Запуск синхронизации…'
                    : 'Выполняется синхронизация данных. Пожалуйста, подождите…'}
          </DialogDescription>
        </DialogHeader>

        {/* Stages */}
        <div className="space-y-2 py-2">
          {STAGES.map((s, i) => {
            const stageIdx = getStageIndex(status?.currentStage ?? null);
            const isActive = i === stageIdx && isRunning;
            const isPast = i < stageIdx || isDone || (i === stageIdx && isDone);
            const counts = getStageCounts(s.id, status?.stageDetails ?? null);
            const resultText = formatStageResult(counts);

            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-2 text-sm px-2 py-2 rounded',
                  isActive && 'bg-primary/10 text-primary font-medium',
                  isPast && 'text-muted-foreground',
                  !isPast && !isActive && 'text-muted-foreground/60',
                )}
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                ) : isPast ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                )}
                <div className="flex-1 min-w-0">
                  <span>{s.label}</span>
                  {isPast && resultText && (
                    <span className="text-[11px] text-muted-foreground ml-1">— {resultText}</span>
                  )}
                  {isActive && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {s.description}
                      {s.id === 'workItems' && status && (
                        <span className="ml-1">
                          ({status.updatedCount} записей обработано)
                        </span>
                      )}
                      {s.id !== 'workItems' && status && status.totalIssues > 0 && (
                        <span className="ml-1">
                          ({totalProcessed} из {status.totalIssues} обработано)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {isPast && counts && counts.errors > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-destructive/5 text-destructive border-destructive/20"
                  >
                    {counts.errors} ошиб.
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {(isRunning || isDone) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {isDone
                  ? `Обработано: ${totalProcessed} записей`
                  : currentStageIdx >= 0
                    ? `Этап ${currentStageIdx + 1} из ${STAGES.length}: ${STAGES[currentStageIdx].label}${status?.updatedCount ? ' (' + status.updatedCount + ' зап.)' : ''}`
                    : 'Подготовка…'}
              </span>
              <span>{isDone ? '100%' : progressPercent + '%'}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Completion stats */}
        {isDone && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-muted/30 border border-border text-center text-xs">
            <div>
              <div className="text-lg font-semibold text-emerald-600">{totalProcessed}</div>
              <div className="text-muted-foreground">Всего обработано</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{totalErrors}</div>
              <div className="text-muted-foreground">Ошибок</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{status?.duration ? Math.round(status.duration / 60) : '—'}</div>
              <div className="text-muted-foreground">Минут</div>
            </div>
          </div>
        )}

        {/* Error info */}
        {isFailed && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ошибка синхронизации</p>
              <p className="text-xs mt-0.5">
                {error || (status?.errors ? JSON.stringify(status.errors) : 'Неизвестная ошибка')}
              </p>
              {totalErrors > 0 && <p className="text-xs mt-1">Всего ошибок: {totalErrors}</p>}
            </div>
          </div>
        )}

        {/* Cancelled info */}
        {cancelled && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border text-sm text-muted-foreground">
            <Ban className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Синхронизация отменена</p>
              <p className="text-xs mt-0.5">Данные, полученные до отмены, сохранены.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-1" /> Отмена
            </Button>
          ) : (
            <Button size="sm" onClick={handleClose} className="bg-primary hover:bg-primary-hover">
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
