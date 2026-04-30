/**
 * AuthAppModule
 *
 * Модуль приложения для Authentication/Authorization.
 * Связывает use cases (application layer) с реализациями репозиториев
 * и сервисов (infrastructure layer) через механизм DI NestJS.
 *
 * Импортирует AuthModule из infrastructure для доступа к JWT, LDAP, Audit, Encryption сервисам.
 * Предоставляет все use case'ы как провайдеры и регистрирует AuthController.
 *
 * Также импортирует PrismaModule для доступа к репозиториям.
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { PrismaRefreshSessionRepository } from '../../infrastructure/prisma/repositories/prisma-refresh-session.repository';
import { PrismaLoginAttemptRepository } from '../../infrastructure/prisma/repositories/prisma-login-attempt.repository';
import { AuthController } from './auth.controller';
import { AuthDomainService } from '../../domain/services/auth.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RefreshSessionRepository } from '../../domain/repositories/refresh-session.repository';
import { LoginAttemptRepository } from '../../domain/repositories/login-attempt.repository';
import { LoginUseCase } from '../../application/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/auth/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/auth/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/auth/use-cases/get-current-user.use-case';
import { JWT_SERVICE, IJwtService } from '../../application/auth/ports/jwt.service';
import {
  LDAP_AUTH_ADAPTER,
  ILdapAuthAdapter,
} from '../../application/auth/ports/ldap-auth.adapter';
import { AUDIT_LOGGER, IAuditLogger } from '../../application/auth/ports/audit-logger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { JwtService } from '../../infrastructure/auth/jwt.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    // ─── Domain Services ───
    AuthDomainService,

    // ─── Use Cases ───
    {
      provide: LoginUseCase,
      useFactory: (
        authDomainService: AuthDomainService,
        userRepository: UserRepository,
        refreshSessionRepository: RefreshSessionRepository,
        loginAttemptRepository: LoginAttemptRepository,
        ldapAuthAdapter: ILdapAuthAdapter,
        jwtService: IJwtService,
        auditLogger: IAuditLogger,
        prismaService: PrismaService,
      ) =>
        new LoginUseCase(
          authDomainService,
          userRepository,
          refreshSessionRepository,
          loginAttemptRepository,
          ldapAuthAdapter,
          jwtService,
          auditLogger,
          prismaService,
        ),
      inject: [
        AuthDomainService,
        PrismaUserRepository,
        PrismaRefreshSessionRepository,
        PrismaLoginAttemptRepository,
        LDAP_AUTH_ADAPTER,
        JWT_SERVICE,
        AUDIT_LOGGER,
        PrismaService,
      ],
    },

    {
      provide: RefreshTokenUseCase,
      useFactory: (
        authDomainService: AuthDomainService,
        refreshSessionRepository: RefreshSessionRepository,
        userRepository: UserRepository,
        jwtService: IJwtService,
        auditLogger: IAuditLogger,
        prismaService: PrismaService,
      ) =>
        new RefreshTokenUseCase(
          authDomainService,
          refreshSessionRepository,
          userRepository,
          jwtService,
          auditLogger,
          prismaService,
        ),
      inject: [
        AuthDomainService,
        PrismaRefreshSessionRepository,
        PrismaUserRepository,
        JWT_SERVICE,
        AUDIT_LOGGER,
        PrismaService,
      ],
    },

    {
      provide: LogoutUseCase,
      useFactory: (refreshSessionRepository: RefreshSessionRepository, auditLogger: IAuditLogger) =>
        new LogoutUseCase(refreshSessionRepository, auditLogger),
      inject: [PrismaRefreshSessionRepository, AUDIT_LOGGER],
    },

    {
      provide: GetCurrentUserUseCase,
      useFactory: (userRepository: UserRepository) => new GetCurrentUserUseCase(userRepository),
      inject: [PrismaUserRepository],
    },

    // ─── Guards ───
    {
      provide: JwtAuthGuard,
      useFactory: (jwtService: JwtService) => {
        const { Reflector } = require('@nestjs/core');
        const reflector = new Reflector();
        return new JwtAuthGuard(jwtService, reflector);
      },
      inject: [JwtService],
    },

    {
      provide: RolesGuard,
      useFactory: () => {
        const { Reflector } = require('@nestjs/core');
        const reflector = new Reflector();
        return new RolesGuard(reflector);
      },
      inject: [],
    },
  ],
  exports: [JwtAuthGuard, RolesGuard, LoginUseCase, RefreshTokenUseCase],
})
export class AuthAppModule {}
