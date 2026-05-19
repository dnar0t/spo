import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtService } from './jwt.service';
import { LdapService } from './ldap.service';
import { EncryptionService } from './encryption.service';
import { AuditLogger } from '../audit/audit-logger';
import { LDAP_AUTH_ADAPTER } from '../../application/auth/ports/ldap-auth.adapter';
import { JWT_SERVICE } from '../../application/auth/ports/jwt.service';
import { AUDIT_LOGGER } from '../../application/auth/ports/audit-logger';
import { ENCRYPTION_SERVICE } from '../../application/auth/ports/encryption.service';

/**
 * AuthModule (Infrastructure)
 *
 * Предоставляет реализации портов из application слоя:
 * - JwtService (IJwtService) — генерация и верификация JWT
 * - LdapService (ILdapAuthAdapter) — LDAP аутентификация через БД (mock/real)
 * - AuditLogger (IAuditLogger) — аудит действий через Prisma
 * - EncryptionService (IEncryptionService) — шифрование AES-256-GCM
 *
 * Экспортирует все реализации для использования в других модулях.
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: JWT_SERVICE,
      useClass: JwtService,
    },
    {
      provide: LDAP_AUTH_ADAPTER,
      useClass: LdapService,
    },
    {
      provide: AUDIT_LOGGER,
      useClass: AuditLogger,
    },
    {
      provide: ENCRYPTION_SERVICE,
      useClass: EncryptionService,
    },
    // Concrete classes also registered for direct injection (e.g., in guards)
    JwtService,
    LdapService,
    AuditLogger,
    EncryptionService,
  ],
  exports: [
    JWT_SERVICE,
    LDAP_AUTH_ADAPTER,
    AUDIT_LOGGER,
    ENCRYPTION_SERVICE,
    JwtService,
    LdapService,
    AuditLogger,
    EncryptionService,
  ],
})
export class AuthModule {}
