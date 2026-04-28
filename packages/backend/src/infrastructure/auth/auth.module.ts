import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtService } from './jwt.service';
import { LdapMockAdapter } from './ldap-mock.adapter';
import { EncryptionService } from './encryption.service';
import { AuditLogger } from '../audit/audit-logger';
import { ILdapAuthAdapter } from '../../application/auth/ports/ldap-auth.adapter';
import { IJwtService } from '../../application/auth/ports/jwt.service';
import { IAuditLogger } from '../../application/auth/ports/audit-logger';
import { IEncryptionService } from '../../application/auth/ports/encryption.service';

/**
 * AuthModule (Infrastructure)
 *
 * Предоставляет реализации портов из application слоя:
 * - JwtService (IJwtService) — генерация и верификация JWT
 * - LdapMockAdapter (ILdapAuthAdapter) — LDAP аутентификация (mock/real)
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
      provide: IJwtService,
      useClass: JwtService,
    },
    {
      provide: ILdapAuthAdapter,
      useClass: LdapMockAdapter,
    },
    {
      provide: IAuditLogger,
      useClass: AuditLogger,
    },
    {
      provide: IEncryptionService,
      useClass: EncryptionService,
    },
    // Concrete classes also registered for direct injection (e.g., in guards)
    JwtService,
    LdapMockAdapter,
    AuditLogger,
    EncryptionService,
  ],
  exports: [
    IJwtService,
    ILdapAuthAdapter,
    IAuditLogger,
    IEncryptionService,
    JwtService,
    LdapMockAdapter,
    AuditLogger,
    EncryptionService,
  ],
})
export class AuthModule {}
