/**
 * TimesheetRow Entity (Domain Layer)
 *
 * Сущность строки табеля (timesheet).
 * Содержит информацию о задаче и её оценках.
 */
export type TimesheetRowSource = 'plan' | 'worklog';
export type TimesheetRowGrade = 'none' | 'satisfactory' | 'good' | 'excellent';
export type TimesheetRowBusinessGrade = 'none' | 'no_benefit' | 'direct' | 'obvious';

export interface TimesheetRowCreateParams {
  id?: string;
  issueIdReadable: string;
  source: TimesheetRowSource;
  minutes: number;
  comment?: string | null;
  managerGrade?: TimesheetRowGrade;
  businessGrade?: TimesheetRowBusinessGrade;
}

export interface TimesheetRowPersistenceData {
  id: string;
  timesheetId: string;
  issueIdReadable: string;
  source: TimesheetRowSource;
  minutes: number;
  comment: string | null;
  managerGrade: TimesheetRowGrade;
  businessGrade: TimesheetRowBusinessGrade;
  createdAt: Date;
  updatedAt: Date;
}

export class TimesheetRow {
  private constructor(
    private readonly _id: string,
    private readonly _timesheetId: string,
    private _issueIdReadable: string,
    private _source: TimesheetRowSource,
    private _minutes: number,
    private _comment: string | null,
    private _managerGrade: TimesheetRowGrade,
    private _businessGrade: TimesheetRowBusinessGrade,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get timesheetId(): string { return this._timesheetId; }
  get issueIdReadable(): string { return this._issueIdReadable; }
  get source(): TimesheetRowSource { return this._source; }
  get minutes(): number { return this._minutes; }
  get comment(): string | null { return this._comment; }
  get managerGrade(): TimesheetRowGrade { return this._managerGrade; }
  get businessGrade(): TimesheetRowBusinessGrade { return this._businessGrade; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Определяет, какие поля изменились при апдейте.
   * Возвращает массив изменений для записи в TimesheetRowChange.
   */
  update(data: Partial<{
    minutes: number;
    comment: string | null;
    managerGrade: TimesheetRowGrade;
    businessGrade: TimesheetRowBusinessGrade;
  }>): Array<{ field: 'minutes' | 'managerGrade' | 'businessGrade'; fromValue: string; toValue: string }> {
    const changes: Array<{ field: 'minutes' | 'managerGrade' | 'businessGrade'; fromValue: string; toValue: string }> = [];

    if (data.minutes !== undefined && data.minutes !== this._minutes) {
      changes.push({ field: 'minutes', fromValue: String(this._minutes), toValue: String(data.minutes) });
      this._minutes = data.minutes;
    }
    if (data.comment !== undefined) {
      this._comment = data.comment;
    }
    if (data.managerGrade !== undefined && data.managerGrade !== this._managerGrade) {
      changes.push({ field: 'managerGrade', fromValue: this._managerGrade, toValue: data.managerGrade });
      this._managerGrade = data.managerGrade;
    }
    if (data.businessGrade !== undefined && data.businessGrade !== this._businessGrade) {
      changes.push({ field: 'businessGrade', fromValue: this._businessGrade, toValue: data.businessGrade });
      this._businessGrade = data.businessGrade;
    }

    if (changes.length > 0) {
      this._updatedAt = new Date();
    }

    return changes;
  }

  // ─── Фабричный метод ───

  static create(params: TimesheetRowCreateParams, timesheetId: string): TimesheetRow {
    const now = new Date();
    return new TimesheetRow(
      params.id ?? crypto.randomUUID(),
      timesheetId,
      params.issueIdReadable,
      params.source,
      params.minutes,
      params.comment ?? null,
      params.managerGrade ?? 'none',
      params.businessGrade ?? 'none',
      now,
      now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: TimesheetRowPersistenceData): TimesheetRow {
    return new TimesheetRow(
      data.id,
      data.timesheetId,
      data.issueIdReadable,
      data.source,
      data.minutes,
      data.comment,
      data.managerGrade,
      data.businessGrade,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      timesheet_id: this._timesheetId,
      issue_id_readable: this._issueIdReadable,
      source: this._source,
      minutes: this._minutes,
      comment: this._comment,
      manager_grade: this._managerGrade,
      business_grade: this._businessGrade,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
