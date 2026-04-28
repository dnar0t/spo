import crypto from 'node:crypto';
import { DomainStateError } from '../errors/domain.error';

/**
 * Сущность сессии refresh token.
 * Содержит бизнес-правила для управления сессиями refresh токенов.
 */
export class RefreshSession {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private _refreshTokenHash: string,
    private readonly _userAgent: string | null,
    private readonly _ipAddress: string | null,
    private _expiresAt: Date,
    private _revokedAt: Date | null,
    private readonly _createdAt: Date,
    private _lastUsedAt: Date | null,
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get refreshTokenHash(): string {
    return this._refreshTokenHash;
  }

  get userAgent(): string | null {
    return this._userAgent;
  }

  get ipAddress(): string | null {
    return this._ipAddress;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get lastUsedAt(): Date | null {
    return this._lastUsedAt;
  }

  // ─── Бизнес-правила ───

  /** Отозвать сессию */
  revoke(): void {
    if (this._revokedAt !== null) {
      throw new DomainStateError('Session is already revoked');
    }
    this._revokedAt = new Date();
  }

  /** Проверка, истекла ли сессия */
  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  /** Проверка, отозвана ли сессия */
  isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  /** Проверка валидности сессии: не просрочена и не отозвана */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  /** Обновить lastUsedAt (touch) */
  touch(): void {
    this._lastUsedAt = new Date();
  }

  /** Обновить хеш токена (при ротации) */
  updateTokenHash(hash: string): void {
    this._refreshTokenHash = hash;
  }

  /** Обновить expiresAt (при ротации) */
  updateExpiresAt(date: Date): void {
    this._expiresAt = date;
  }

  // ─── Фабричные методы ───

  /** Создать новую сессию refresh token */
  static create(params: {
    id?: string;
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }): RefreshSession {
    const now = new Date();
    return new RefreshSession(
      params.id ?? crypto.randomUUID(),
      params.userId,
      params.refreshTokenHash,
      params.userAgent ?? null,
      params.ipAddress ?? null,
      params.expiresAt,
      null,
      now,
      now,
    );
  }

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    lastUsedAt: Date | null;
  }): RefreshSession {
    return new RefreshSession(
      data.id,
      data.userId,
      data.refreshTokenHash,
      data.userAgent,
      data.ipAddress,
      data.expiresAt,
      data.revokedAt,
      data.createdAt,
      data.lastUsedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      user_id: this._userId,
      refresh_token_hash: this._refreshTokenHash,
      user_agent: this._userAgent,
      ip_address: this._ipAddress,
      expires_at: this._expiresAt,
      revoked_at: this._revokedAt,
      created_at: this._createdAt,
      last_used_at: this._lastUsedAt,
    };
  }
}

/** Константа: макс. срок жизни refresh сессии — 7 дней */
export const REFRESH_SESSION_MAX_DAYS = 7;
