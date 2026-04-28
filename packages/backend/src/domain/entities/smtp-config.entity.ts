/**
 * SmtpConfig Entity (Domain Layer)
 *
 * Сущность конфигурации SMTP для отправки email-уведомлений.
 * Содержит настройки почтового сервера, учётные данные и отправителя.
 */
import { InvalidArgumentError } from '../errors/domain.error';

export interface SmtpConfigCreateParams {
  id?: string;
  host: string;
  port: number;
  username: string;
  encryptedPassword: string;
  senderName: string;
  senderEmail: string;
  isActive?: boolean;
}

export interface SmtpConfigPersistenceData {
  id: string;
  host: string;
  port: number;
  username: string;
  encryptedPassword: string;
  senderName: string;
  senderEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SmtpConfig {
  private constructor(
    private readonly _id: string,
    private _host: string,
    private _port: number,
    private _username: string,
    private _encryptedPassword: string,
    private _senderName: string,
    private _senderEmail: string,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.validate();
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get host(): string {
    return this._host;
  }

  get port(): number {
    return this._port;
  }

  get username(): string {
    return this._username;
  }

  get encryptedPassword(): string {
    return this._encryptedPassword;
  }

  get senderName(): string {
    return this._senderName;
  }

  get senderEmail(): string {
    return this._senderEmail;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Валидация ───

  private validate(): void {
    if (!this._host || this._host.trim().length === 0) {
      throw new InvalidArgumentError('host', 'SMTP host cannot be empty');
    }

    if (!this._port || this._port <= 0 || this._port > 65535) {
      throw new InvalidArgumentError('port', 'SMTP port must be between 1 and 65535');
    }

    if (!this._username || this._username.trim().length === 0) {
      throw new InvalidArgumentError('username', 'SMTP username cannot be empty');
    }

    if (!this._encryptedPassword || this._encryptedPassword.trim().length === 0) {
      throw new InvalidArgumentError('encryptedPassword', 'SMTP password cannot be empty');
    }

    if (!this._senderName || this._senderName.trim().length === 0) {
      throw new InvalidArgumentError('senderName', 'Sender name cannot be empty');
    }

    if (!this._senderEmail || this._senderEmail.trim().length === 0) {
      throw new InvalidArgumentError('senderEmail', 'Sender email cannot be empty');
    }

    if (!this._senderEmail.includes('@')) {
      throw new InvalidArgumentError('senderEmail', 'Sender email must be a valid email address');
    }
  }

  // ─── Бизнес-методы ───

  /** Активировать SMTP конфигурацию */
  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /** Деактивировать SMTP конфигурацию */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /** Обновить конфигурацию (частичное обновление) */
  update(params: {
    host?: string;
    port?: number;
    username?: string;
    encryptedPassword?: string;
    senderName?: string;
    senderEmail?: string;
    isActive?: boolean;
  }): void {
    if (params.host !== undefined) this._host = params.host;
    if (params.port !== undefined) this._port = params.port;
    if (params.username !== undefined) this._username = params.username;
    if (params.encryptedPassword !== undefined) this._encryptedPassword = params.encryptedPassword;
    if (params.senderName !== undefined) this._senderName = params.senderName;
    if (params.senderEmail !== undefined) this._senderEmail = params.senderEmail;
    if (params.isActive !== undefined) this._isActive = params.isActive;

    this.validate();
    this._updatedAt = new Date();
  }

  // ─── Фабричные методы ───

  /** Создать новую SMTP конфигурацию */
  static create(params: SmtpConfigCreateParams): SmtpConfig {
    return new SmtpConfig(
      params.id ?? crypto.randomUUID(),
      params.host,
      params.port,
      params.username,
      params.encryptedPassword,
      params.senderName,
      params.senderEmail,
      params.isActive ?? true,
      new Date(),
      new Date(),
    );
  }

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: SmtpConfigPersistenceData): SmtpConfig {
    return new SmtpConfig(
      data.id,
      data.host,
      data.port,
      data.username,
      data.encryptedPassword,
      data.senderName,
      data.senderEmail,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      host: this._host,
      port: this._port,
      username: this._username,
      encryptedPassword: this._encryptedPassword,
      senderName: this._senderName,
      senderEmail: this._senderEmail,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
