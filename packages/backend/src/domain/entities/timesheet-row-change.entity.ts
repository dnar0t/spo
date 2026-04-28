/**
 * TimesheetRowChange Entity (Domain Layer)
 *
 * Сущность, фиксирующая изменение одного поля строки таймшита.
 */
import { InvalidArgumentError } from '../errors/domain.error';

export interface TimesheetRowChangeCreateParams {
  id?: string;
  timesheetId: string;
  rowId: string;
  actorId: string;
  field: 'minutes' | 'managerGrade' | 'businessGrade';
  fromValue: string;
  toValue: string;
  createdAt?: Date;
}

export interface TimesheetRowChangePersistenceData {
  id: string;
  timesheetId: string;
  rowId: string;
  actorId: string;
  field: 'minutes' | 'managerGrade' | 'businessGrade';
  fromValue: string;
  toValue: string;
  createdAt: Date;
}

export const TIMESHEET_ROW_CHANGE_FIELDS = ['minutes', 'managerGrade', 'businessGrade'] as const;
export type TimesheetRowChangeField = (typeof TIMESHEET_ROW_CHANGE_FIELDS)[number];

export class TimesheetRowChange {
  private constructor(
    private readonly _id: string,
    private readonly _timesheetId: string,
    private readonly _rowId: string,
    private readonly _actorId: string,
    private readonly _field: TimesheetRowChangeField,
    private readonly _fromValue: string,
    private readonly _toValue: string,
    private readonly _createdAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get timesheetId(): string { return this._timesheetId; }
  get rowId(): string { return this._rowId; }
  get actorId(): string { return this._actorId; }
  get field(): TimesheetRowChangeField { return this._field; }
  get fromValue(): string { return this._fromValue; }
  get toValue(): string { return this._toValue; }
  get createdAt(): Date { return this._createdAt; }

  // ─── Фабричный метод ───

  static create(params: TimesheetRowChangeCreateParams): TimesheetRowChange {
    if (!TIMESHEET_ROW_CHANGE_FIELDS.includes(params.field as any)) {
      throw new InvalidArgumentError(
        'field',
        `Invalid field "${params.field}". Allowed: ${TIMESHEET_ROW_CHANGE_FIELDS.join(', ')}`,
      );
    }

    return new TimesheetRowChange(
      params.id ?? crypto.randomUUID(),
      params.timesheetId,
      params.rowId,
      params.actorId,
      params.field,
      params.fromValue,
      params.toValue,
      params.createdAt ?? new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: TimesheetRowChangePersistenceData): TimesheetRowChange {
    return new TimesheetRowChange(
      data.id,
      data.timesheetId,
      data.rowId,
      data.actorId,
      data.field,
      data.fromValue,
      data.toValue,
      data.createdAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      timesheet_id: this._timesheetId,
      row_id: this._rowId,
      actor_id: this._actorId,
      field: this._field,
      from_value: this._fromValue,
      to_value: this._toValue,
      created_at: this._createdAt,
    };
  }
}
