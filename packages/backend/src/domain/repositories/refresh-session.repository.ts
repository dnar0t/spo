import { RefreshSession } from '../entities/refresh-session.entity';
import { BaseRepository } from './base.repository';

export interface RefreshSessionRepository extends BaseRepository<RefreshSession, string> {
  /** Найти все сессии пользователя */
  findByUserId(userId: string): Promise<RefreshSession[]>;

  /** Найти только валидные сессии пользователя (не revoked и не expired) */
  findValidByUserId(userId: string): Promise<RefreshSession[]>;

  /** Найти сессию по хешу refresh token */
  findByTokenHash(tokenHash: string): Promise<RefreshSession | null>;

  /** Отозвать все сессии пользователя */
  revokeAllByUserId(userId: string): Promise<void>;

  /** Отозвать конкретную сессию */
  revokeSession(sessionId: string): Promise<void>;

  /** Удалить истёкшие сессии (возвращает количество удалённых) */
  deleteExpired(): Promise<number>;
}
