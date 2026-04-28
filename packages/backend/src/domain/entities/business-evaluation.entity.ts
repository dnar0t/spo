/**
 * BusinessEvaluation Entity (Domain Layer)
 *
 * Сущность оценки бизнеса для задачи в периоде.
 * Оценка бизнеса не привязана к конкретному сотруднику, а к задаче.
 */
import { Percentage } from '../value-objects/percentage.vo';
import { InvalidArgumentError } from '../errors/domain.error';

export interface BusinessEvaluationCreateParams {
  id?: string;
  periodId: string;
  youtrackIssueId: string;
  evaluatedById: string;
  evaluationType: string;
  percent?: Percentage | null;
  comment?: string | null;
  evaluationKey?: string;
}

export interface BusinessEvaluationPersistenceData {
  id: string;
  periodId: string;
  youtrackIssueId: string;
  evaluatedById: string;
  evaluationType: string;
  percent: number | null;
  comment: string | null;
  evaluationKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BusinessEvaluation {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private readonly _youtrackIssueId: string,
    private _evaluatedById: string,
    private _evaluationType: string,
    private _percent: Percentage | null,
    private _comment: string | null,
    private _evaluationKey: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get periodId(): string { return this._periodId; }
  get youtrackIssueId(): string { return this._youtrackIssueId; }
  get evaluatedById(): string { return this._evaluatedById; }
  get evaluationType(): string { return this._evaluationType; }
  get percent(): Percentage | null { return this._percent; }
  get comment(): string | null { return this._comment; }
  get evaluationKey(): string | null { return this._evaluationKey; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // ─── Бизнес-методы ───

  /** Обновить оценку */
  update(params: { evaluationType?: string; percent?: Percentage | null; comment?: string | null; evaluatedById?: string; evaluationKey?: string }): void {
    if (params.evaluationType !== undefined) this._evaluationType = params.evaluationType;
    if (params.percent !== undefined) this._percent = params.percent;
    if (params.comment !== undefined) this._comment = params.comment;
    if (params.evaluatedById !== undefined) this._evaluatedById = params.evaluatedById;
    if (params.evaluationKey !== undefined) this._evaluationKey = params.evaluationKey;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: BusinessEvaluationCreateParams): BusinessEvaluation {
    const now = new Date();
    const evaluationKey = params.evaluationKey ?? `${params.periodId}_${params.youtrackIssueId}`;
    return new BusinessEvaluation(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.youtrackIssueId,
      params.evaluatedById,
      params.evaluationType,
      params.percent ?? null,
      params.comment ?? null,
      evaluationKey,
      now,
      now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: BusinessEvaluationPersistenceData): BusinessEvaluation {
    return new BusinessEvaluation(
      data.id,
      data.periodId,
      data.youtrackIssueId,
      data.evaluatedById,
      data.evaluationType,
      data.percent !== null ? Percentage.fromBasisPoints(data.percent) : null,
      data.comment,
      data.evaluationKey,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      period_id: this._periodId,
      youtrack_issue_id: this._youtrackIssueId,
      evaluated_by_id: this._evaluatedById,
      evaluation_type: this._evaluationType,
      percent: this._percent?.basisPoints ?? null,
      comment: this._comment,
      evaluation_key: this._evaluationKey,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
