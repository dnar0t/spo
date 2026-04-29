import { AuthDomainService } from '../../../domain/services/auth.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { RefreshSessionRepository } from '../../../domain/repositories/refresh-session.repository';
import { LoginAttemptRepository } from '../../../domain/repositories/login-attempt.repository';
import { LoginAttempt } from '../../../domain/entities/login-attempt.entity';
import { IJwtService } from '../ports/jwt.service';
import { ILdapAuthAdapter } from '../ports/ldap-auth.adapter';
import { IAuditLogger } from '../ports/audit-logger';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import {
  InvalidCredentialsError,
  AccountLockedError,
  LdapConnectionError,
} from '../../../domain/errors/auth.errors';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export class LoginUseCase {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MINUTES = 15;

  constructor(
    private readonly authDomainService: AuthDomainService,
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly loginAttemptRepository: LoginAttemptRepository,
    private readonly ldapAuthAdapter: ILdapAuthAdapter,
    private readonly jwtService: IJwtService,
    private readonly auditLogger: IAuditLogger,
    private readonly prismaService: PrismaService,
  ) {}

  async execute(
    dto: LoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    // 1. Find user by login
    const user = await this.userRepository.findByLogin(dto.login);
    if (!user) {
      await this.recordFailedAttempt(dto.login, context?.ipAddress);
      throw new InvalidCredentialsError();
    }

    // 2. Validate login attempt (account not blocked/terminated)
    try {
      this.authDomainService.validateLoginAttempt(user);
    } catch (error) {
      if (error instanceof AccountLockedError) {
        await this.auditLogger.log({
          userId: user.id,
          action: 'LOGIN_BLOCKED',
          entityType: 'User',
          entityId: user.id,
          details: { reason: error.message },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
      throw error;
    }

    // 3. Check brute-force limits before LDAP bind
    const recentFailedCount = await this.loginAttemptRepository.countRecentFailedByLogin(
      dto.login,
      this.RATE_LIMIT_WINDOW_MINUTES,
    );
    try {
      this.authDomainService.checkBruteForce(recentFailedCount, this.MAX_FAILED_ATTEMPTS);
    } catch (error) {
      if (error instanceof AccountLockedError) {
        await this.auditLogger.log({
          userId: user.id,
          action: 'BRUTE_FORCE_LOCKED',
          entityType: 'User',
          entityId: user.id,
          details: { failedAttempts: recentFailedCount },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        });
      }
      throw error;
    }

    // 4. Authenticate via LDAP (AD bind)
    if (this.ldapAuthAdapter.isConfigured()) {
      try {
        const ldapResult = await this.ldapAuthAdapter.authenticate(dto.login, dto.password);

        if (!ldapResult.success) {
          throw new InvalidCredentialsError();
        }
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          await this.recordFailedAttempt(dto.login, context?.ipAddress, user.id);
          await this.auditLogger.log({
            userId: user.id,
            action: 'LOGIN_FAILED',
            entityType: 'User',
            entityId: user.id,
            details: { reason: 'Invalid credentials' },
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
          });
          throw error;
        }
        throw new LdapConnectionError(`LDAP authentication failed: ${(error as Error).message}`);
      }
    } else {
      // Mock mode: only check password is non-empty
      if (!dto.password || dto.password.trim().length === 0) {
        await this.recordFailedAttempt(dto.login, context?.ipAddress, user.id);
        throw new InvalidCredentialsError();
      }
    }

    // 5. Record successful login attempt
    await this.loginAttemptRepository.save(
      LoginAttempt.create({
        login: dto.login,
        ipAddress: context?.ipAddress ?? 'unknown',
        isSuccess: true,
      }),
    );

    // 6. Revoke all old refresh sessions for this user
    await this.refreshSessionRepository.revokeAllByUserId(user.id);

    // 7. Create new refresh session
    const { rawToken, session } = this.authDomainService.createRefreshSession(
      user.id,
      context?.userAgent,
      context?.ipAddress,
    );
    await this.refreshSessionRepository.save(session);

    // 8. Load user roles from DB
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
    const roles: string[] = userRoles.map((ur) => ur.role.name);

    // 9. Generate access token with roles
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      login: user.login,
      sessionId: session.id,
      roles,
    });

    // 10. Audit log
    await this.auditLogger.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      details: { sessionId: session.id, roles },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 11. Return AuthResponseDto
    return {
      accessToken,
      refreshToken: rawToken,
      user: {
        id: user.id,
        login: user.login,
        fullName: user.fullName ?? user.login,
        email: user.email,
        roles,
      },
    };
  }

  private async recordFailedAttempt(
    login: string,
    ipAddress?: string,
    userId?: string,
  ): Promise<void> {
    const attempt = LoginAttempt.create({
      login,
      ipAddress: ipAddress ?? 'unknown',
      isSuccess: false,
    });
    await this.loginAttemptRepository.save(attempt);

    const recentFailedCount = await this.loginAttemptRepository.countRecentFailedByLogin(
      login,
      this.RATE_LIMIT_WINDOW_MINUTES,
    );

    if (recentFailedCount >= this.MAX_FAILED_ATTEMPTS) {
      await this.auditLogger.log({
        userId: userId ?? login,
        action: 'ACCOUNT_TEMPORARILY_LOCKED',
        entityType: 'User',
        entityId: userId,
        details: { failedAttempts: recentFailedCount, login },
        ipAddress,
      });
    }
  }
}
