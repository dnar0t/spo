/**
 * TimesheetStatusTransition Entity (Domain Layer)
 *
 * Сущность, фиксирующая переход таймшита между статусами.
 * Хранит полную историю изменений статуса: кто, когда, откуда/куда и комментарий.
 */
export interface TimesheetStatusTransitionCreateParams {
  id?: string;
  timesheetId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  comment?: string | null;
  createdAt?: Date;
}

export interface TimesheetStatusTransitionPersistenceData {
  id: string;
  timesheetId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  createdAt: Date;
}

export class TimesheetStatusTransition {
  private constructor(
    private readonly _id: string,
    private readonly _timesheetId: string,
    private readonly _actorId: string,
    private readonly _fromStatus: string,
    private readonly _toStatus: string,
    private readonly _comment: string | null,
    private readonly _createdAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get timesheetId(): string { return this._timesheetId; }
  get actorId(): string { return this._actorId; }
  get fromStatus(): string { return this._fromStatus; }
  get toStatus(): string { return this._toStatus; }
  get comment(): string | null { return this._comment; }
  get createdAt(): Date { return this._createdAt; }

  // ─── Фабричный метод ───

  static create(params: TimesheetStatusTransitionCreateParams): TimesheetStatusTransition {
    return new TimesheetStatusTransition(
      params.id ?? crypto.randomUUID(),
      params.timesheetId,
      params.actorId,
      params.fromStatus,
      params.toStatus,
      params.comment ?? null,
      params.createdAt ?? new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: TimesheetStatusTransitionPersistenceData): TimesheetStatusTransition {
    return new TimesheetStatusTransition(
      data.id,
      data.timesheetId,
      data.actorId,
      data.fromStatus,
      data.toStatus,
      data.comment,
      data.createdAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      timesheet_id: this._timesheetId,
      actor_id: this._actorId,
      from_status: this._fromStatus,
      to_status: this._toStatus,
      comment: this._comment,
      created_at: this._createdAt,
    };
  }
}
