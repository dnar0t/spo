/**
 * ExportJob Entity (Domain Layer)
 *
 * Сущность задачи на экспорт (асинхронная генерация отчётов/файлов).
 * Отслеживает жизненный цикл: PENDING → PROCESSING → COMPLETED | FAILED
 * Содержит метаданные о типе экспорта, формате, местоположении файла.
 */
import { InvalidArgumentError, DomainStateError, NotFoundError } from '../errors/domain.error';

export type ExportType =
  | 'PLAN'
  | 'SUMMARY_REPORT'
  | 'PERSONAL_REPORT'
  | 'AUDIT_LOG'
  | 'JSON_ACCOUNTING';

export type ExportFormat = 'XLSX' | 'PDF' | 'JSON';

export type ExportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ExportJobCreateParams {
  id?: string;
  exportType: ExportType;
  format: ExportFormat;
  userId: string;
  periodId?: string | null;
}

export interface ExportJobPersistenceData {
  id: string;
  exportType: ExportType;
  periodId: string | null;
  userId: string;
  format: ExportFormat;
  status: ExportJobStatus;
  filePath: string | null;
  fileName: string | null;
  error: string | null;
  createdAt: string;  // ISO string
  completedAt: string | null;  // ISO string
  expiresAt: string;  // ISO string
}

const EXPORT_TTL_HOURS = 24;

export class ExportJob {
  private constructor(
    private readonly _id: string,
    private readonly _exportType: ExportType,
    private readonly _periodId: string | null,
    private readonly _userId: string,
    private readonly _format: ExportFormat,
    private _status: ExportJobStatus,
    private _filePath: string | null,
    private _fileName: string | null,
    private _error: string | null,
    private readonly _createdAt: Date,
    private _completedAt: Date | null,
    private readonly _expiresAt: Date,
  ) {
    this.validateExportType();
    this.validateFormat();
  }

  // ─── Валидация ───

  private validateExportType(): void {
    const allowed: ExportType[] = ['PLAN', 'SUMMARY_REPORT', 'PERSONAL_REPORT', 'AUDIT_LOG', 'JSON_ACCOUNTING'];
    if (!allowed.includes(this._exportType)) {
      throw new InvalidArgumentError(
        'exportType',
        `Must be one of ${allowed.join(', ')}. Got: ${this._exportType}`,
      );
    }
  }

  private validateFormat(): void {
    const allowed: ExportFormat[] = ['XLSX', 'PDF', 'JSON'];
    if (!allowed.includes(this._format)) {
      throw new InvalidArgumentError(
        'format',
        `Must be one of ${allowed.join(', ')}. Got: ${this._format}`,
      );
    }
  }

  // ─── Геттеры ───

  get id(): string { return this._id; }
  get exportType(): ExportType { return this._exportType; }
  get periodId(): string | null { return this._periodId; }
  get userId(): string { return this._userId; }
  get format(): ExportFormat { return this._format; }
  get status(): ExportJobStatus { return this._status; }
  get filePath(): string | null { return this._filePath; }
  get fileName(): string | null { return this._fileName; }
  get error(): string | null { return this._error; }
  get createdAt(): Date { return this._createdAt; }
  get completedAt(): Date | null { return this._completedAt; }
  get expiresAt(): Date { return this._expiresAt; }

  // ─── Бизнес-методы ───

  /** Перевести задачу в статус PROCESSING */
  start(): void {
    if (this._status !== 'PENDING') {
      throw new DomainStateError(
        `Cannot start export job in status ${this._status}. Expected PENDING`,
        { jobId: this._id, currentStatus: this._status },
      );
    }
    this._status = 'PROCESSING';
  }

  /** Завершить задачу успешно */
  complete(filePath: string, fileName: string): void {
    if (this._status !== 'PROCESSING') {
      throw new DomainStateError(
        `Cannot complete export job in status ${this._status}. Expected PROCESSING`,
        { jobId: this._id, currentStatus: this._status },
      );
    }
    this._status = 'COMPLETED';
    this._filePath = filePath;
    this._fileName = fileName;
    this._completedAt = new Date();
  }

  /** Завершить задачу с ошибкой */
  fail(error: string): void {
    if (this._status === 'COMPLETED') {
      throw new DomainStateError(
        'Cannot fail already completed export job',
        { jobId: this._id },
      );
    }
    this._status = 'FAILED';
    this._error = error;
    this._completedAt = new Date();
  }

  /** Проверить, истекло ли время хранения файла */
  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  // ─── Фабричный метод ───

  /** Создать новую задачу на экспорт */
  static create(params: ExportJobCreateParams): ExportJob {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPORT_TTL_HOURS * 60 * 60 * 1000);

    return new ExportJob(
      params.id ?? crypto.randomUUID(),
      params.exportType,
      params.periodId ?? null,
      params.userId,
      params.format,
      'PENDING',
      null,
      null,
      null,
      now,
      null,
      expiresAt,
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence data */
  static fromPersistence(data: ExportJobPersistenceData): ExportJob {
    return new ExportJob(
      data.id,
      data.exportType,
      data.periodId,
      data.userId,
      data.format,
      data.status,
      data.filePath,
      data.fileName,
      data.error,
      new Date(data.createdAt),
      data.completedAt ? new Date(data.completedAt) : null,
      new Date(data.expiresAt),
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): ExportJobPersistenceData {
    return {
      id: this._id,
      exportType: this._exportType,
      periodId: this._periodId,
      userId: this._userId,
      format: this._format,
      status: this._status,
      filePath: this._filePath,
      fileName: this._fileName,
      error: this._error,
      createdAt: this._createdAt.toISOString(),
      completedAt: this._completedAt?.toISOString() ?? null,
      expiresAt: this._expiresAt.toISOString(),
    };
  }
}
