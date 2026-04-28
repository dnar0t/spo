import crypto from 'node:crypto';

/**
 * Сущность для отслеживания попыток входа (brute-force protection).
 * Содержит информацию о каждой попытке аутентификации.
 */
export class LoginAttempt {
  private constructor(
    private readonly _id: string,
    private readonly _login: string,
    private readonly _ipAddress: string,
    private readonly _isSuccess: boolean,
    private readonly _attemptedAt: Date,
    private _blockedUntil: Date | null,
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get login(): string {
    return this._login;
  }

  get ipAddress(): string {
    return this._ipAddress;
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get attemptedAt(): Date {
    return this._attemptedAt;
  }

  get blockedUntil(): Date | null {
    return this._blockedUntil;
  }

  // ─── Бизнес-правила ───

  /** Проверка, заблокирован ли логин (если blockedUntil > сейчас) */
  isBlocked(): boolean {
    if (this._blockedUntil === null) {
      return false;
    }
    return new Date() < this._blockedUntil;
  }

  // ─── Фабричные методы ───

  /** Создать новую запись о попытке входа */
  static create(params: {
    id?: string;
    login: string;
    ipAddress: string;
    isSuccess: boolean;
    blockedUntil?: Date | null;
  }): LoginAttempt {
    return new LoginAttempt(
      params.id ?? crypto.randomUUID(),
      params.login,
      params.ipAddress,
      params.isSuccess,
      new Date(),
      params.blockedUntil ?? null,
    );
  }

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: {
    id: string;
    login: string;
    ipAddress: string;
    isSuccess: boolean;
    attemptedAt: Date;
    blockedUntil: Date | null;
  }): LoginAttempt {
    return new LoginAttempt(
      data.id,
      data.login,
      data.ipAddress,
      data.isSuccess,
      data.attemptedAt,
      data.blockedUntil,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      login: this._login,
      ip_address: this._ipAddress,
      is_success: this._isSuccess,
      attempted_at: this._attemptedAt,
      blocked_until: this._blockedUntil,
    };
  }
}
