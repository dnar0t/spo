/**
 * ManagerEvaluation Entity (Domain Layer)
 *
 * Сущность оценки руководителя для задачи сотрудника в периоде.
 */
import { Percentage } from '../value-objects/percentage.vo';
import { InvalidArgumentError } from '../errors/domain.error';

export interface ManagerEvaluationCreateParams {
  id?: string;
  periodId: string;
  youtrackIssueId: string;
  userId: string;
  evaluatedById: string;
  evaluationType: string;
  percent?: Percentage | null;
  comment?: string | null;
}

export interface ManagerEvaluationPersistenceData {
  id: string;
  periodId: string;
  youtrackIssueId: string;
  userId: string;
  evaluatedById: string;
  evaluationType: string;
  percent: number | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ManagerEvaluation {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private readonly _youtrackIssueId: string,
    private readonly _userId: string,
    private _evaluatedById: string,
    private _evaluationType: string,
    private _percent: Percentage | null,
    private _comment: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get periodId(): string { return this._periodId; }
  get youtrackIssueId(): string { return this._youtrackIssueId; }
  get userId(): string { return this._userId; }
  get evaluatedById(): string { return this._evaluatedById; }
  get evaluationType(): string { return this._evaluationType; }
  get percent(): Percentage | null { return this._percent; }
  get comment(): string | null { return this._comment; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // ─── Бизнес-методы ───

  /** Обновить оценку */
  update(params: { evaluationType?: string; percent?: Percentage | null; comment?: string | null; evaluatedById?: string }): void {
    if (params.evaluationType !== undefined) this._evaluationType = params.evaluationType;
    if (params.percent !== undefined) this._percent = params.percent;
    if (params.comment !== undefined) this._comment = params.comment;
    if (params.evaluatedById !== undefined) this._evaluatedById = params.evaluatedById;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: ManagerEvaluationCreateParams): ManagerEvaluation {
    const now = new Date();
    return new ManagerEvaluation(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.youtrackIssueId,
      params.userId,
      params.evaluatedById,
      params.evaluationType,
      params.percent ?? null,
      params.comment ?? null,
      now,
      now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: ManagerEvaluationPersistenceData): ManagerEvaluation {
    return new ManagerEvaluation(
      data.id,
      data.periodId,
      data.youtrackIssueId,
      data.userId,
      data.evaluatedById,
      data.evaluationType,
      data.percent !== null ? Percentage.fromBasisPoints(data.percent) : null,
      data.comment,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      youtrack_issue_id: this._youtrackIssueId,
      user_id: this._userId,
      evaluated_by_id: this._evaluatedById,
      evaluation_type: this._evaluationType,
      percent: this._percent?.basisPoints ?? null,
      comment: this._comment,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
