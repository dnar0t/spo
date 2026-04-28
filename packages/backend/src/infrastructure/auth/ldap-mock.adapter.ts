import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILdapAuthAdapter } from '../../application/auth/ports/ldap-auth.adapter';

/**
 * LDAP Mock Adapter
 *
 * Реализация ILdapAuthAdapter для разработки и тестирования.
 *
 * В mock-режиме:
 * - Проверяет, что пароль не пустой
 * - Не выполняет реальный LDAP bind
 * - Всегда возвращает успех, если пароль не пуст
 *
 * В реальном режиме (isMockMode = false):
 * - Пытается выполнить LDAP bind (заглушка — будет реализовано позже)
 * - Пока что также пропускает аутентификацию
 */
@Injectable()
export class LdapMockAdapter implements ILdapAuthAdapter {
  private readonly logger = new Logger(LdapMockAdapter.name);
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isMockMode = this.configService.get<boolean>('LDAP_MOCK_ENABLED', true);
    if (this.isMockMode) {
      this.logger.warn('LDAP is running in MOCK mode — no real authentication performed');
    }
  }

  /**
   * Аутентификация пользователя через LDAP.
   *
   * В mock-режиме: проверяет, что пароль не пустой.
   * В реальном режиме: будет выполнять LDAP bind (пока заглушка).
   */
  async authenticate(
    login: string,
    password: string,
  ): Promise<{ success: boolean; userDetails?: { dn: string; cn: string; mail: string } }> {
    if (this.isMockMode) {
      // Mock mode: password must be non-empty
      if (!password || password.trim().length === 0) {
        this.logger.warn(`Mock LDAP: authentication failed for login "${login}" — empty password`);
        return { success: false };
      }

      this.logger.debug(`Mock LDAP: authentication successful for login "${login}"`);
      return {
        success: true,
        userDetails: {
          dn: `CN=${login},OU=Users,DC=company,DC=com`,
          cn: login,
          mail: `${login}@company.com`,
        },
      };
    }

    // Real mode — will implement LDAP bind later
    // For now, act as pass-through (placeholder)
    this.logger.warn(
      `Real LDAP mode is not fully implemented yet. ` +
        `Authentication for "${login}" will be skipped.`,
    );

    if (!password || password.trim().length === 0) {
      return { success: false };
    }

    return {
      success: true,
      userDetails: {
        dn: `CN=${login},OU=Users,DC=company,DC=com`,
        cn: login,
        mail: `${login}@company.com`,
      },
    };
  }

  /**
   * Проверка, настроен ли LDAP (сконфигурирован ли хост).
   * В mock-режиме всегда возвращает true.
   */
  isConfigured(): boolean {
    if (this.isMockMode) {
      return true; // Mock is always "configured"
    }

    const ldapHost = this.configService.get<string>('LDAP_HOST');
    const ldapPort = this.configService.get<string>('LDAP_PORT');
    return !!(ldapHost && ldapPort);
  }
}
