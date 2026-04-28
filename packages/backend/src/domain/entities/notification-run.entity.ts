/**
 * NotificationRun Entity (Domain Layer)
 *
 * Сущность, представляющая лог отправки уведомления.
 * Фиксирует факт отправки, статус и возможные ошибки.
 */
import { InvalidArgumentError } from '../errors/domain.error';

export type NotificationRunStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationRunCreateParams {
  id?: string;
  templateId?: string | null;
  eventName: string;
  recipientId: string;
  status?: NotificationRunStatus;
}

export interface NotificationRunPersistenceData {
  id: string;
  templateId: string | null;
  eventName: string;
  recipientId: string;
  status: string;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export class NotificationRun {
  private constructor(
    private readonly _id: string,
    private readonly _templateId: string | null,
    private readonly _eventName: string,
    private readonly _recipientId: string,
    private _status: NotificationRunStatus,
    private _error: string | null,
    private _sentAt: Date | null,
    private readonly _createdAt: Date,
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get templateId(): string | null {
    return this._templateId;
  }

  get eventName(): string {
    return this._eventName;
  }

  get recipientId(): string {
    return this._recipientId;
  }

  get status(): NotificationRunStatus {
    return this._status;
  }

  get error(): string | null {
    return this._error;
  }

  get sentAt(): Date | null {
    return this._sentAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ─── Бизнес-методы ───

  /** Отметить как отправленное */
  markSent(): void {
    if (this._status !== 'PENDING') {
      throw new InvalidArgumentError(
        'status',
        `Cannot mark as SENT: current status is "${this._status}". Only PENDING runs can be marked as sent.`,
      );
    }

    this._status = 'SENT';
    this._sentAt = new Date();
    this._error = null;
  }

  /** Отметить как failed */
  markFailed(error: string): void {
    if (!error || error.trim().length === 0) {
      throw new InvalidArgumentError('error', 'Error message cannot be empty when marking as FAILED');
    }

    this._status = 'FAILED';
    this._error = error;
    this._sentAt = null;
  }

  // ─── Фабричные методы ───

  /** Создать новый лог отправки */
  static create(params: NotificationRunCreateParams): NotificationRun {
    const validStatuses: NotificationRunStatus[] = ['PENDING', 'SENT', 'FAILED'];
    const status = params.status ?? 'PENDING';

    if (!validStatuses.includes(status)) {
      throw new InvalidArgumentError(
        'status',
        `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    return new NotificationRun(
      params.id ?? crypto.randomUUID(),
      params.templateId ?? null,
      params.eventName,
      params.recipientId,
      status,
      null,
      status === 'SENT' ? new Date() : null,
      new Date(),
    );
  }

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: NotificationRunPersistenceData): NotificationRun {
    const validStatuses: string[] = ['PENDING', 'SENT', 'FAILED'];

    if (!validStatuses.includes(data.status)) {
      throw new InvalidArgumentError(
        'status',
        `Invalid persisted status "${data.status}". Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    return new NotificationRun(
      data.id,
      data.templateId,
      data.eventName,
      data.recipientId,
      data.status as NotificationRunStatus,
      data.error,
      data.sentAt,
      data.createdAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      templateId: this._templateId,
      eventName: this._eventName,
      recipientId: this._recipientId,
      status: this._status,
      error: this._error,
      sentAt: this._sentAt,
      createdAt: this._createdAt,
    };
  }
}
