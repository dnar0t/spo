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
  logs?: { level: string; message: string }[];
}

type SyncStage =
  | { id: 'idle'; label: string }
  | { id: 'starting'; label: string }
  | { id: 'users'; label: string }
  | { id: 'projects'; label: string }
  | { id: 'issues'; label: string }
  | { id: 'workItems'; label: string }
  | { id: 'done'; label: string }
  | { id: 'error'; label: string };

const STAGES: SyncStage[] = [
  { id: 'starting', label: 'Запуск синхронизации…' },
  { id: 'users', label: 'Синхронизация пользователей…' },
  { id: 'projects', label: 'Синхронизация проектов…' },
  { id: 'issues', label: 'Синхронизация задач…' },
  { id: 'workItems', label: 'Синхронизация трудозатрат…' },
  { id: 'done', label: 'Синхронизация завершена' },
];

function currentStageIndex(status: SyncRunStatus | null, stage: string): number {
  if (!status) return 0;
  if (status.status === 'COMPLETED') return STAGES.length - 1;
  if (status.status === 'FAILED') return STAGES.length - 1;
  // Estimate stage based on counts
  if (status.totalIssues > 0) {
    const progress = (status.createdCount + status.updatedCount) / Math.max(status.totalIssues, 1);
    if (progress < 0.3) return 2; // issues
    if (progress < 0.7) return 3; // issues advanced
    return 4; // workItems
  }
  return 1; // projects
}

export function SyncDialog({ open, onOpenChange }: SyncDialogProps) {
  const [syncRunId, setSyncRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncRunStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stageIdx = currentStageIndex(status, '');
  const isDone = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED' || !!error;
  const isRunning = !isDone && !isFailed && !cancelled && syncRunId !== null;
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
      // Таймаут 30 секунд на запуск синхронизации
      const timeoutId = setTimeout(() => abort.abort(), 30000);
      const resp = await fetch('/api/youtrack/sync', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + getAccessToken(),
          'Content-Type': 'application/json',
        },
        signal: abort.signal,
      });
      clearTimeout(timeoutId);
      const data = await resp.json();
      if (!data.success) {
        setError(data.error?.message || 'Не удалось запустить синхронизацию');
        setLoading(false);
        return;
      }
      const runId = data.data?.syncRunId;
      if (!runId) {
        setError('Сервер не вернул ID синхронизации');
        setLoading(false);
        return;
      }
      setSyncRunId(runId);
      setLoading(false);

      // Начинаем опрос статуса
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/youtrack/sync-runs/' + runId, {
            headers: { Authorization: 'Bearer ' + getAccessToken() },
            signal: abort.signal,
          });
          const d = await r.json();
          if (d.success && d.data) {
            setStatus(d.data);
            if (d.data.status === 'COMPLETED' || d.data.status === 'FAILED') {
              if (pollingRef.current) clearInterval(pollingRef.current);
            }
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            // ignore polling errors
          }
        }
      }, 2000);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Сервер не отвечает. Проверьте, настроена ли интеграция с YouTrack.');
      } else {
        setError(e.message || 'Ошибка соединения с сервером.');
      }
      setStatus({
        id: '',
        triggerType: '',
        status: 'FAILED',
        totalIssues: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        startedAt: '',
        completedAt: null,
        duration: null,
        errors: null,
      });
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

  const progressPercent =
    status && status.totalIssues > 0
      ? Math.min(100, Math.round((totalProcessed / Math.max(status.totalIssues, 1)) * 100))
      : status?.status === 'COMPLETED'
        ? 100
        : 0;

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
            <Loader2 className={cn('h-5 w-5', !isRunning && !isDone && !isFailed && 'opacity-0')} />
            Синхронизация с YouTrack
          </DialogTitle>
          <DialogDescription>
            {isDone
              ? 'Синхронизация успешно завершена.'
              : isFailed
                ? 'При синхронизации произошли ошибки.'
                : cancelled
                  ? 'Синхронизация отменена.'
                  : 'Выполняется синхронизация данных. Пожалуйста, подождите…'}
          </DialogDescription>
        </DialogHeader>

        {/* Stages */}
        <div className="space-y-2 py-2">
          {STAGES.map((s, i) => {
            const isActive = i === stageIdx && isRunning;
            const isPast = i < stageIdx || (i === stageIdx && (isDone || isFailed));
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-2 text-sm px-2 py-1 rounded',
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
                <span>{s.label}</span>
                {isPast && s.id === 'done' && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {status?.totalIssues || 0} задач, {totalProcessed} обработано
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        {isRunning && status && status.totalIssues > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Обработано: {totalProcessed} из {status.totalIssues} задач
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Error info */}
        {isFailed && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ошибка синхронизации</p>
              <p className="text-xs mt-0.5">
                {error || status?.errors ? JSON.stringify(status?.errors) : 'Неизвестная ошибка'}
              </p>
              {totalErrors > 0 && <p className="text-xs mt-1">Количество ошибок: {totalErrors}</p>}
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
