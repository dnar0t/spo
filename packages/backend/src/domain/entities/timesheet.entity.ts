/**
 * Timesheet Entity (Domain Layer)
 *
 * Сущность табеля (timesheet) сотрудника за месяц.
 * Содержит статусную машину, строки табеля, историю переходов и изменения строк.
 */
import { DomainStateError, BusinessRuleError } from '../errors/domain.error';
import {
  TimesheetRow,
  TimesheetRowCreateParams,
  TimesheetRowGrade,
  TimesheetRowBusinessGrade,
} from './timesheet-row.entity';
import { TimesheetStatusTransition } from './timesheet-status-transition.entity';
import { TimesheetRowChange } from './timesheet-row-change.entity';

export type TimesheetStatus = 'draft' | 'submitted' | 'manager_approved' | 'approved' | 'rejected';

const VALID_TRANSITIONS: Record<TimesheetStatus, TimesheetStatus[]> = {
  draft: ['submitted'],
  submitted: ['draft', 'manager_approved', 'rejected'],
  manager_approved: ['approved', 'rejected'],
  approved: [],
  rejected: ['draft'],
};

const ROW_MUTABLE_STATUSES: TimesheetStatus[] = ['draft', 'submitted', 'rejected'];

export interface TimesheetCreateParams {
  id?: string;
  employeeId: string;
  year: number;
  month: number;
  status?: TimesheetStatus;
  rows?: TimesheetRow[];
  history?: TimesheetStatusTransition[];
  rowChanges?: TimesheetRowChange[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimesheetPersistenceData {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  status: TimesheetStatus;
  rows: TimesheetRowCreateParams[];
  history: Array<{
    id: string;
    actorId: string;
    fromStatus: string;
    toStatus: string;
    comment: string | null;
    createdAt: Date;
  }>;
  rowChanges: Array<{
    id: string;
    rowId: string;
    actorId: string;
    field: 'minutes' | 'managerGrade' | 'businessGrade';
    fromValue: string;
    toValue: string;
    createdAt: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Timesheet {
  private readonly _id: string;
  private readonly _employeeId: string;
  private readonly _year: number;
  private readonly _month: number;
  private _status: TimesheetStatus;
  private _rows: TimesheetRow[];
  private _history: TimesheetStatusTransition[];
  private _rowChanges: TimesheetRowChange[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    employeeId: string,
    year: number,
    month: number,
    status: TimesheetStatus,
    rows: TimesheetRow[],
    history: TimesheetStatusTransition[],
    rowChanges: TimesheetRowChange[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._employeeId = employeeId;
    this._year = year;
    this._month = month;
    this._status = status;
    this._rows = rows;
    this._history = history;
    this._rowChanges = rowChanges;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }
  get employeeId(): string {
    return this._employeeId;
  }
  get year(): number {
    return this._year;
  }
  get month(): number {
    return this._month;
  }
  get status(): TimesheetStatus {
    return this._status;
  }
  get rows(): TimesheetRow[] {
    return [...this._rows];
  }
  get history(): TimesheetStatusTransition[] {
    return [...this._history];
  }
  get rowChanges(): TimesheetRowChange[] {
    return [...this._rowChanges];
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Вспомогательные приватные методы ───

  /**
   * Проверяет, можно ли изменять строки в текущем статусе.
   */
  private assertRowsMutable(): void {
    if (!ROW_MUTABLE_STATUSES.includes(this._status)) {
      throw new DomainStateError(
        `Cannot modify rows in status "${this._status}". Allowed statuses: ${ROW_MUTABLE_STATUSES.join(', ')}`,
        { currentStatus: this._status, allowedStatuses: ROW_MUTABLE_STATUSES },
      );
    }
  }

  /**
   * Проверяет допустимость перехода между статусами.
   */
  private assertValidTransition(targetStatus: TimesheetStatus): void {
    const allowed = VALID_TRANSITIONS[this._status];
    if (!allowed.includes(targetStatus)) {
      throw new BusinessRuleError(
        `Cannot transition from "${this._status}" to "${targetStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
        { from: this._status, to: targetStatus, allowedTransitions: allowed },
      );
    }
  }

  /**
   * Записывает переход в историю.
   */
  private recordChange(
    actorId: string,
    fromStatus: TimesheetStatus,
    toStatus: TimesheetStatus,
    comment?: string,
  ): void {
    const transition = TimesheetStatusTransition.create({
      timesheetId: this._id,
      actorId,
      fromStatus,
      toStatus,
      comment: comment ?? null,
    });
    this._history = [...this._history, transition];
  }

  /**
   * Записывает изменения строк.
   */
  private trackChange(
    actorId: string,
    rowId: string,
    field: 'minutes' | 'managerGrade' | 'businessGrade',
    fromValue: string,
    toValue: string,
  ): void {
    const change = TimesheetRowChange.create({
      timesheetId: this._id,
      rowId,
      actorId,
      field,
      fromValue,
      toValue,
    });
    this._rowChanges = [...this._rowChanges, change];
  }

  // ─── Бизнес-методы для работы со строками ───

  /**
   * Добавляет новую строку в табель.
   * Доступно только в статусах: draft, submitted, rejected.
   */
  addRow(params: TimesheetRowCreateParams): void {
    this.assertRowsMutable();
    this._rows = [...this._rows, TimesheetRow.create(params, this._id)];
    this._updatedAt = new Date();
  }

  /**
   * Обновляет существующую строку табеля.
   * Доступно только в статусах: draft, submitted, rejected.
   *
   * @param rowId - ID строки для обновления
   * @param data - частичные данные для обновления (minutes, comment, managerGrade, businessGrade)
   * @param actorId - ID пользователя, совершающего изменение
   */
  updateRow(
    rowId: string,
    data: Partial<{
      minutes: number;
      comment: string | null;
      managerGrade: TimesheetRowGrade;
      businessGrade: TimesheetRowBusinessGrade;
    }>,
    actorId: string,
  ): void {
    this.assertRowsMutable();
    const rowIndex = this._rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) {
      throw new BusinessRuleError(`Row with id "${rowId}" not found in timesheet`, {
        timesheetId: this._id,
        rowId,
      });
    }

    const row = this._rows[rowIndex];
    const changes = row.update(data);

    for (const change of changes) {
      this.trackChange(actorId, rowId, change.field, change.fromValue, change.toValue);
    }

    this._rows = [...this._rows.slice(0, rowIndex), row, ...this._rows.slice(rowIndex + 1)];

    this._updatedAt = new Date();
  }

  /**
   * Удаляет строку из табеля.
   * Доступно только в статусах: draft, submitted, rejected.
   */
  removeRow(rowId: string): void {
    this.assertRowsMutable();
    const rowIndex = this._rows.findIndex((r) => r.id === rowId);
    if (rowIndex === -1) {
      throw new BusinessRuleError(`Row with id "${rowId}" not found in timesheet`, {
        timesheetId: this._id,
        rowId,
      });
    }
    this._rows = [...this._rows.slice(0, rowIndex), ...this._rows.slice(rowIndex + 1)];
    this._updatedAt = new Date();
  }

  // ─── Статусная машина ───

  /**
   * Отправить табель на согласование (draft → submitted).
   */
  submit(actorId: string): void {
    this.assertValidTransition('submitted');
    const fromStatus = this._status;
    this._status = 'submitted';
    this.recordChange(actorId, fromStatus, 'submitted');
    this._updatedAt = new Date();
  }

  /**
   * Отозвать табель (submitted → draft).
   */
  recall(actorId: string): void {
    this.assertValidTransition('draft');
    const fromStatus = this._status;
    this._status = 'draft';
    this.recordChange(actorId, fromStatus, 'draft');
    this._updatedAt = new Date();
  }

  /**
   * Согласовать табель руководителем (submitted → manager_approved).
   */
  managerApprove(actorId: string): void {
    this.assertValidTransition('manager_approved');
    const fromStatus = this._status;
    this._status = 'manager_approved';
    this.recordChange(actorId, fromStatus, 'manager_approved');
    this._updatedAt = new Date();
  }

  /**
   * Утвердить табель директором (manager_approved → approved).
   */
  directorApprove(actorId: string): void {
    this.assertValidTransition('approved');
    const fromStatus = this._status;
    this._status = 'approved';
    this.recordChange(actorId, fromStatus, 'approved');
    this._updatedAt = new Date();
  }

  /**
   * Отклонить табель из любого активного статуса в rejected.
   */
  reject(actorId: string, comment: string): void {
    this.assertValidTransition('rejected');
    const fromStatus = this._status;
    this._status = 'rejected';
    this.recordChange(actorId, fromStatus, 'rejected', comment);
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: TimesheetCreateParams): Timesheet {
    const now = new Date();
    return new Timesheet(
      params.id ?? crypto.randomUUID(),
      params.employeeId,
      params.year,
      params.month,
      params.status ?? 'draft',
      params.rows ?? [],
      params.history ?? [],
      params.rowChanges ?? [],
      params.createdAt ?? now,
      params.updatedAt ?? now,
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: TimesheetPersistenceData): Timesheet {
    return new Timesheet(
      data.id,
      data.employeeId,
      data.year,
      data.month,
      data.status,
      data.rows.map((row) => TimesheetRow.create(row, data.id)),
      data.history.map((h) =>
        TimesheetStatusTransition.create({
          ...h,
          timesheetId: data.id,
        }),
      ),
      data.rowChanges.map((rc) =>
        TimesheetRowChange.create({
          ...rc,
          timesheetId: data.id,
        }),
      ),
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  toPersistence(): TimesheetPersistenceData {
    return {
      id: this._id,
      employeeId: this._employeeId,
      year: this._year,
      month: this._month,
      status: this._status,
      rows: this._rows.map((row) => ({
        id: row.id,
        issueIdReadable: row.issueIdReadable,
        source: row.source,
        minutes: row.minutes,
        comment: row.comment,
        managerGrade: row.managerGrade,
        businessGrade: row.businessGrade,
      })),
      history: this._history.map((h) => ({
        id: h.id,
        actorId: h.actorId,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        createdAt: h.createdAt,
      })),
      rowChanges: this._rowChanges.map((rc) => ({
        id: rc.id,
        rowId: rc.rowId,
        actorId: rc.actorId,
        field: rc.field,
        fromValue: rc.fromValue,
        toValue: rc.toValue,
        createdAt: rc.createdAt,
      })),
    };
  }
}
