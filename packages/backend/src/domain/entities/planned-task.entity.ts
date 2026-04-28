/**
 * PlannedTask Entity (Domain Layer)
 *
 * Сущность запланированной задачи в рамках отчётного периода.
 * Содержит бизнес-правила назначения исполнителя, обновления плановых
 * часов и готовности задачи.
 */
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';
import { InvalidArgumentError, DomainStateError } from '../errors/domain.error';

export interface PlannedTaskCreateParams {
  id?: string;
  periodId: string;
  issueNumber: string;
  summary: string;
  youtrackIssueId?: string | null;
  assigneeId?: string | null;
  estimationMinutes?: Minutes | null;
  plannedDevMinutes?: Minutes | null;
  plannedTestMinutes?: Minutes | null;
  plannedMgmtMinutes?: Minutes | null;
  plannedDebugMinutes?: Minutes | null;
  readinessPercent?: Percentage | null;
  sortOrder?: number;
  isPlanned?: boolean;
  parentIssueNumber?: string | null;
  parentIssueId?: string | null;
}

export interface PlannedTaskPersistenceData {
  id: string;
  periodId: string;
  issueNumber: string;
  summary: string;
  youtrackIssueId: string | null;
  assigneeId: string | null;
  estimationMinutes: number | null;
  plannedDevMinutes: number | null;
  plannedTestMinutes: number | null;
  plannedMgmtMinutes: number | null;
  plannedDebugMinutes: number | null;
  readinessPercent: number;
  sortOrder: number;
  isPlanned: boolean;
  parentIssueNumber: string | null;
  parentIssueId: string | null;
}

export interface UpdatePlannedHoursParams {
  plannedDevMinutes?: Minutes | null;
  plannedTestMinutes?: Minutes | null;
  plannedMgmtMinutes?: Minutes | null;
  plannedDebugMinutes?: Minutes | null;
}

export class PlannedTask {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private _issueNumber: string,
    private _summary: string,
    private _youtrackIssueId: string | null,
    private _assigneeId: string | null,
    private _estimationMinutes: Minutes | null,
    private _plannedDevMinutes: Minutes | null,
    private _plannedTestMinutes: Minutes | null,
    private _plannedMgmtMinutes: Minutes | null,
    private _plannedDebugMinutes: Minutes | null,
    private _readinessPercent: Percentage,
    private _sortOrder: number,
    private _isPlanned: boolean,
    private _parentIssueNumber: string | null,
    private _parentIssueId: string | null,
  ) {
    this.validateIssueNumber();
    this.validateSummary();
  }

  // ─── Валидация ───

  private validateIssueNumber(): void {
    if (!this._issueNumber || this._issueNumber.trim().length === 0) {
      throw new InvalidArgumentError('issueNumber', 'Issue number cannot be empty');
    }
    // Стандартный формат: PROJECT-123
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(this._issueNumber)) {
      throw new InvalidArgumentError(
        'issueNumber',
        `Issue number must match format PROJECT-123. Got: ${this._issueNumber}`,
      );
    }
  }

  private validateSummary(): void {
    if (!this._summary || this._summary.trim().length === 0) {
      throw new InvalidArgumentError('summary', 'Summary cannot be empty');
    }
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get periodId(): string {
    return this._periodId;
  }

  get issueNumber(): string {
    return this._issueNumber;
  }

  get summary(): string {
    return this._summary;
  }

  get youtrackIssueId(): string | null {
    return this._youtrackIssueId;
  }

  get assigneeId(): string | null {
    return this._assigneeId;
  }

  get estimationMinutes(): Minutes | null {
    return this._estimationMinutes;
  }

  get plannedDevMinutes(): Minutes | null {
    return this._plannedDevMinutes;
  }

  get plannedTestMinutes(): Minutes | null {
    return this._plannedTestMinutes;
  }

  get plannedMgmtMinutes(): Minutes | null {
    return this._plannedMgmtMinutes;
  }

  get plannedDebugMinutes(): Minutes | null {
    return this._plannedDebugMinutes;
  }

  /** Общее количество запланированных минут (dev + test + mgmt + debug) */
  get totalPlannedMinutes(): Minutes {
    const dev = this._plannedDevMinutes?.minutes ?? 0;
    const test = this._plannedTestMinutes?.minutes ?? 0;
    const mgmt = this._plannedMgmtMinutes?.minutes ?? 0;
    const debug = this._plannedDebugMinutes?.minutes ?? 0;
    return Minutes.fromMinutes(dev + test + mgmt + debug);
  }

  get readinessPercent(): Percentage {
    return this._readinessPercent;
  }

  get sortOrder(): number {
    return this._sortOrder;
  }

  get isPlanned(): boolean {
    return this._isPlanned;
  }

  get parentIssueNumber(): string | null {
    return this._parentIssueNumber;
  }

  get parentIssueId(): string | null {
    return this._parentIssueId;
  }

  // ─── Бизнес-правила ───

  /** Назначить задачу на пользователя */
  assignTo(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new InvalidArgumentError('userId', 'User ID cannot be empty');
    }
    if (this._assigneeId === userId) {
      throw new DomainStateError('Task is already assigned to this user', {
        taskId: this._id,
        assigneeId: userId,
      });
    }
    this._assigneeId = userId;
  }

  /** Снять назначение с задачи */
  unassign(): void {
    if (!this._assigneeId) {
      throw new DomainStateError('Task has no assignee to unassign', {
        taskId: this._id,
      });
    }
    this._assigneeId = null;
  }

  /** Обновить плановые часы по категориям */
  updatePlannedHours(params: UpdatePlannedHoursParams): void {
    if (params.plannedDevMinutes !== undefined) this._plannedDevMinutes = params.plannedDevMinutes;
    if (params.plannedTestMinutes !== undefined) this._plannedTestMinutes = params.plannedTestMinutes;
    if (params.plannedMgmtMinutes !== undefined) this._plannedMgmtMinutes = params.plannedMgmtMinutes;
    if (params.plannedDebugMinutes !== undefined) this._plannedDebugMinutes = params.plannedDebugMinutes;

    // После обновления проверяем, что хотя бы одна категория имеет значение
    const totalMinutes = this.totalPlannedMinutes.minutes;
    // Переводим в isPlanned на основе наличия планового времени
    this._isPlanned = totalMinutes > 0;
  }

  /** Обновить процент готовности */
  updateReadiness(percent: Percentage): void {
    if (percent.isNegative) {
      throw new InvalidArgumentError('readinessPercent', 'Readiness percent cannot be negative');
    }
    this._readinessPercent = percent;

    // Если готовность 100%, автоматически помечаем как запланированную
    if (this._readinessPercent.isFull && !this._isPlanned) {
      this._isPlanned = true;
    }
  }

  /** Установить порядок сортировки */
  setSortOrder(order: number): void {
    if (!Number.isInteger(order)) {
      throw new InvalidArgumentError('sortOrder', `Sort order must be an integer. Got: ${order}`);
    }
    this._sortOrder = order;
  }

  /** Проверить, имеет ли задача родителя */
  hasParent(): boolean {
    return this._parentIssueNumber !== null || this._parentIssueId !== null;
  }

  /** Привязать к родительской задаче */
  setParent(parentIssueNumber: string, parentIssueId: string): void {
    if (!parentIssueNumber || parentIssueNumber.trim().length === 0) {
      throw new InvalidArgumentError('parentIssueNumber', 'Parent issue number cannot be empty');
    }
    this._parentIssueNumber = parentIssueNumber;
    this._parentIssueId = parentIssueId;
  }

  // ─── Фабричный метод ───

  /** Создать новую запланированную задачу */
  static create(params: PlannedTaskCreateParams): PlannedTask {
    return new PlannedTask(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.issueNumber,
      params.summary,
      params.youtrackIssueId ?? null,
      params.assigneeId ?? null,
      params.estimationMinutes ?? null,
      params.plannedDevMinutes ?? null,
      params.plannedTestMinutes ?? null,
      params.plannedMgmtMinutes ?? null,
      params.plannedDebugMinutes ?? null,
      params.readinessPercent ?? Percentage.zero(),
      params.sortOrder ?? 0,
      params.isPlanned ?? false,
      params.parentIssueNumber ?? null,
      params.parentIssueId ?? null,
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: PlannedTaskPersistenceData): PlannedTask {
    return new PlannedTask(
      data.id,
      data.periodId,
      data.issueNumber,
      data.summary,
      data.youtrackIssueId,
      data.assigneeId,
      data.estimationMinutes !== null ? Minutes.fromMinutes(data.estimationMinutes) : null,
      data.plannedDevMinutes !== null ? Minutes.fromMinutes(data.plannedDevMinutes) : null,
      data.plannedTestMinutes !== null ? Minutes.fromMinutes(data.plannedTestMinutes) : null,
      data.plannedMgmtMinutes !== null ? Minutes.fromMinutes(data.plannedMgmtMinutes) : null,
      data.plannedDebugMinutes !== null ? Minutes.fromMinutes(data.plannedDebugMinutes) : null,
      Percentage.fromBasisPoints(data.readinessPercent),
      data.sortOrder,
      data.isPlanned,
      data.parentIssueNumber,
      data.parentIssueId,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      issue_number: this._issueNumber,
      summary: this._summary,
      youtrack_issue_id: this._youtrackIssueId,
      assignee_id: this._assigneeId,
      estimation_minutes: this._estimationMinutes?.minutes ?? null,
      planned_dev_minutes: this._plannedDevMinutes?.minutes ?? null,
      planned_test_minutes: this._plannedTestMinutes?.minutes ?? null,
      planned_mgmt_minutes: this._plannedMgmtMinutes?.minutes ?? null,
      planned_debug_minutes: this._plannedDebugMinutes?.minutes ?? null,
      readiness_percent: this._readinessPercent.basisPoints,
      sort_order: this._sortOrder,
      is_planned: this._isPlanned,
      parent_issue_number: this._parentIssueNumber,
      parent_issue_id: this._parentIssueId,
    };
  }
}
