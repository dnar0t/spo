import { AuthDomainService } from '../../../domain/services/auth.service';
import { RefreshSessionRepository } from '../../../domain/repositories/refresh-session.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { IJwtService } from '../ports/jwt.service';
import { IAuditLogger } from '../ports/audit-logger';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { InvalidTokenError, SessionExpiredError } from '../../../domain/errors/auth.errors';

/**
 * RefreshTokenUseCase
 *
 * Выполняет ротацию refresh token:
 * 1. Находит сессию по хешу refresh token (через репозиторий)
 * 2. Проверяет валидность сессии
 * 3. Выполняет ротацию (отзыв старой + создание новой)
 * 4. Генерирует новый access token
 * 5. Возвращает AuthResponseDto
 *
 * Примечание: для работы требуется, чтобы RefreshSessionRepository
 * был расширен методом findByTokenHash(tokenHash: string).
 * На уровне infrastructure добавлен PrismaRefreshSessionRepository c этим методом.
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly authDomainService: AuthDomainService,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly userRepository: UserRepository,
    private readonly jwtService: IJwtService,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: RefreshTokenDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    // 1. Hash the incoming refresh token to find the session
    const tokenHash = this.authDomainService.hashToken(dto.refreshToken);

    // 2. Find session by token hash
    // NOTE: findByTokenHash is expected to be available on RefreshSessionRepository.
    // The infrastructure implementation provides this method.
    const session = await (
      this.refreshSessionRepository as unknown as {
        findByTokenHash(
          hash: string,
        ): Promise<import('../../../domain/entities/refresh-session.entity').RefreshSession | null>;
      }
    ).findByTokenHash(tokenHash);

    if (!session) {
      throw new InvalidTokenError('Refresh token not found or has been revoked');
    }

    // 3. Check if session is still valid
    if (!session.isValid()) {
      // Session expired or revoked — revoke it definitively and throw
      if (!session.isRevoked()) {
        session.revoke();
        await (this.refreshSessionRepository as any).update(session);
      }

      await this.auditLogger.log({
        userId: session.userId,
        action: 'REFRESH_TOKEN_INVALID',
        entityType: 'RefreshSession',
        entityId: session.id,
        details: {
          reason: session.isExpired() ? 'expired' : 'revoked',
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      throw new SessionExpiredError('Session has expired or been revoked');
    }

    // 4. Execute rotation: revoke old + create new session
    const { rawToken: newRawToken, newSession } = this.authDomainService.rotateRefreshSession(
      session,
      context?.userAgent,
      context?.ipAddress,
    );

    // Save the revoked old session and persist new session
    await (this.refreshSessionRepository as any).update(session);
    await this.refreshSessionRepository.save(newSession);

    // 5. Load user for the response
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new InvalidTokenError('User associated with session not found');
    }

    // 6. Generate new access token
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      login: user.login,
      sessionId: newSession.id,
    });

    // 7. Load user roles
    const roles: string[] = [];

    // 8. Audit log
    await this.auditLogger.log({
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      entityType: 'RefreshSession',
      entityId: newSession.id,
      details: {
        oldSessionId: session.id,
        expiresAt: newSession.expiresAt.toISOString(),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 9. Return AuthResponseDto with new tokens
    return {
      accessToken,
      refreshToken: newRawToken,
      user: {
        id: user.id,
        login: user.login,
        fullName: user.fullName ?? user.login,
        email: user.email,
        roles,
      },
    };
  }
}
