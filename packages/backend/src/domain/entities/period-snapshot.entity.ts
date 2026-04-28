/**
 * PeriodSnapshot Entity (Domain Layer)
 *
 * Сущность снэпшота отчётного периода.
 * Хранит "замороженную" копию всех данных периода на момент закрытия:
 * ставки сотрудников, формулы, шкалы оценок, задачи, факт, отчёты.
 * Все JSON-поля хранятся как Record<string, unknown> в памяти
 * и передаются как объекты в Prisma (который сам сериализует в JSONB).
 */
import { InvalidArgumentError } from '../errors/domain.error';

export interface PeriodSnapshotCreateParams {
  id?: string;
  periodId: string;
  employeeRates: Record<string, unknown>;
  formulas: Record<string, unknown>;
  evaluationScales: Record<string, unknown>;
  workItems: Record<string, unknown>;
  issues: Record<string, unknown>;
  issueHierarchy: Record<string, unknown>;
  reportLines: Record<string, unknown>;
  aggregates: Record<string, unknown>;
}

export interface PeriodSnapshotPersistenceData {
  id: string;
  periodId: string;
  employeeRates: Record<string, unknown>;
  formulas: Record<string, unknown>;
  evaluationScales: Record<string, unknown>;
  workItems: Record<string, unknown>;
  issues: Record<string, unknown>;
  issueHierarchy: Record<string, unknown>;
  reportLines: Record<string, unknown>;
  aggregates: Record<string, unknown>;
  createdAt: Date;
}

export class PeriodSnapshot {
  private constructor(
    private readonly _id: string,
    private readonly _periodId: string,
    private readonly _employeeRates: Record<string, unknown>,
    private readonly _formulas: Record<string, unknown>,
    private readonly _evaluationScales: Record<string, unknown>,
    private readonly _workItems: Record<string, unknown>,
    private readonly _issues: Record<string, unknown>,
    private readonly _issueHierarchy: Record<string, unknown>,
    private readonly _reportLines: Record<string, unknown>,
    private readonly _aggregates: Record<string, unknown>,
    private readonly _createdAt: Date,
  ) {
    this.validate();
  }

  // ─── Валидация ───

  private validate(): void {
    if (!this._periodId || this._periodId.trim().length === 0) {
      throw new InvalidArgumentError('periodId', 'Period ID is required');
    }
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get periodId(): string {
    return this._periodId;
  }

  get employeeRates(): Record<string, unknown> {
    return { ...this._employeeRates };
  }

  get formulas(): Record<string, unknown> {
    return { ...this._formulas };
  }

  get evaluationScales(): Record<string, unknown> {
    return { ...this._evaluationScales };
  }

  get workItems(): Record<string, unknown> {
    return { ...this._workItems };
  }

  get issues(): Record<string, unknown> {
    return { ...this._issues };
  }

  get issueHierarchy(): Record<string, unknown> {
    return { ...this._issueHierarchy };
  }

  get reportLines(): Record<string, unknown> {
    return { ...this._reportLines };
  }

  get aggregates(): Record<string, unknown> {
    return { ...this._aggregates };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ─── Фабричный метод ───

  /** Создать новый снэпшот периода */
  static create(params: PeriodSnapshotCreateParams): PeriodSnapshot {
    return new PeriodSnapshot(
      params.id ?? crypto.randomUUID(),
      params.periodId,
      params.employeeRates,
      params.formulas,
      params.evaluationScales,
      params.workItems,
      params.issues,
      params.issueHierarchy,
      params.reportLines,
      params.aggregates,
      new Date(),
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: PeriodSnapshotPersistenceData): PeriodSnapshot {
    return new PeriodSnapshot(
      data.id,
      data.periodId,
      data.employeeRates,
      data.formulas,
      data.evaluationScales,
      data.workItems,
      data.issues,
      data.issueHierarchy,
      data.reportLines,
      data.aggregates,
      data.createdAt,
    );
  }

  /**
   * Преобразовать для сохранения в Prisma.
   * Возвращает camelCase поля, соответствующие именам в Prisma модели.
   */
  toPersistence(): {
    id: string;
    periodId: string;
    employeeRates: Record<string, unknown>;
    formulas: Record<string, unknown>;
    evaluationScales: Record<string, unknown>;
    workItems: Record<string, unknown>;
    issues: Record<string, unknown>;
    issueHierarchy: Record<string, unknown>;
    reportLines: Record<string, unknown>;
    aggregates: Record<string, unknown>;
    createdAt: Date;
  } {
    return {
      id: this._id,
      periodId: this._periodId,
      employeeRates: this._employeeRates,
      formulas: this._formulas,
      evaluationScales: this._evaluationScales,
      workItems: this._workItems,
      issues: this._issues,
      issueHierarchy: this._issueHierarchy,
      reportLines: this._reportLines,
      aggregates: this._aggregates,
      createdAt: this._createdAt,
    };
  }
}
