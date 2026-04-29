// Снапшот плана спринта (моки). Заполняется при фиксации плана в модуле «Планирование»
// и используется в «Финансах» как «Оценка готовности на начало периода» и «Оценка готовности
// плановая (на конец периода)». Здесь — статические демо-данные для текущего периода.
//
// Семантика по ТЗ:
//   readinessAtStart — % готовности задачи на момент старта спринта (фиксируется,
//                      берётся из последнего закрытого периода);
//   readinessPlan    — % готовности задачи, который команда планирует достичь к концу
//                      спринта (выставляет менеджер/директор при планировании).
//
// Демо-снимок строим на основе spentHours/estimateHours: для переходящих задач берём
// фактическое накопление, для новых — 0; план обычно > старта (на сколько готовы взять).

import { backlog, effectiveEstimate, effectiveSpent } from "./planningMock";

export interface PlanSnapshotEntry {
  idReadable: string;
  readinessAtStart: number; // 0..100
  readinessPlan: number; // 0..100
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeStart(idReadable: string): number {
  const issue = backlog.find((b) => b.idReadable === idReadable);
  if (!issue) return 0;
  const est = effectiveEstimate(issue);
  if (!est) return 0;
  const spent = effectiveSpent(issue);
  // Если есть явная readiness — используем её; иначе считаем от потраченных часов.
  if (issue.readiness > 0) return clamp(issue.readiness);
  if (spent > 0) return clamp((spent / est) * 100);
  return 0;
}

// Зашитый «снимок плана» спринта: задаём для нескольких ключевых задач,
// для остальных — 100% (взято в работу до завершения).
const PLAN_OVERRIDES: Record<string, number> = {
  "ERP-201": 80,
  "ERP-202": 100,
  "ERP-203": 70,
  "ERP-204": 90,
  "ERP-318": 100,
  "ERP-412": 100,
  "BNK-87": 75,
  "BNK-88": 100,
  "BNK-89": 100,
  "BNK-90": 50,
  "BNK-92": 60,
  "BNK-101": 100,
  "BNK-115": 100,
  "GOV-23": 50,
  "GOV-31": 40,
  "GOV-45": 60,
  "RTL-14": 50,
  "RTL-22": 100,
  "RTL-28": 60,
  "ERP-520": 50,
  "ERP-527": 100,
};

export const planSnapshot: PlanSnapshotEntry[] = backlog.map((b) => {
  const start = computeStart(b.idReadable);
  const planRaw = PLAN_OVERRIDES[b.idReadable] ?? 100;
  // План не может быть меньше старта.
  const plan = Math.max(start, planRaw);
  return { idReadable: b.idReadable, readinessAtStart: start, readinessPlan: plan };
});

const SNAPSHOT_INDEX = new Map(planSnapshot.map((p) => [p.idReadable, p]));

export function planSnapshotFor(idReadable: string): PlanSnapshotEntry | undefined {
  return SNAPSHOT_INDEX.get(idReadable);
}
