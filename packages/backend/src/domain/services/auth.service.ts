import crypto from 'node:crypto';
import { User } from '../entities/user.entity';
import { RefreshSession, REFRESH_SESSION_MAX_DAYS } from '../entities/refresh-session.entity';
import { AccountLockedError } from '../errors/auth.errors';

/**
 * AuthDomainService — stateless сервис с доменной логикой аутентификации.
 * Содержит бизнес-правила для управления входом, refresh-сессиями и brute-force защитой.
 */
export class AuthDomainService {
  /**
   * Проверка возможности входа: не заблокирован, активен, не уволен.
   * @throws AccountLockedError если пользователь заблокирован
   */
  validateLoginAttempt(user: User): void {
    if (!user.canLogin()) {
      throw new AccountLockedError('Account is blocked or inactive');
    }
    if (user.isTerminated()) {
      throw new AccountLockedError('Account is terminated');
    }
  }

  /**
   * Создать новый refresh token и сессию.
   * Возвращает сырой токен (отдаётся клиенту) и сущность сессии (сохраняется в БД).
   */
  createRefreshSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): { rawToken: string; session: RefreshSession } {
    const rawToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_SESSION_MAX_DAYS);

    const session = RefreshSession.create({
      userId,
      refreshTokenHash: tokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return { rawToken, session };
  }

  /**
   * Верификация и ротация refresh сессии.
   * Отзывает текущую сессию и создаёт новую с новым токеном.
   */
  rotateRefreshSession(
    currentSession: RefreshSession,
    userAgent?: string,
    ipAddress?: string,
  ): { rawToken: string; newSession: RefreshSession } {
    if (!currentSession.isValid()) {
      throw new Error('Cannot rotate an invalid session');
    }

    // Отзываем текущую сессию
    currentSession.revoke();

    // Создаём новую сессию
    return this.createRefreshSession(
      currentSession.userId,
      userAgent ?? currentSession.userAgent ?? undefined,
      ipAddress ?? currentSession.ipAddress ?? undefined,
    );
  }

  /**
   * Проверка количества неудачных попыток входа (brute-force protection).
   * @throws AccountLockedError если превышен лимит
   */
  checkBruteForce(failedAttempts: number, maxAttempts: number): void {
    if (failedAttempts >= maxAttempts) {
      throw new AccountLockedError(`Account locked due to ${failedAttempts} failed login attempts`);
    }
  }

  /**
   * Хеширование refresh token с помощью SHA-256.
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Генерация криптостойкого случайного токена.
   * Длина 48 байт → 64 символа в hex-представлении.
   */
  generateSecureToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }
}
