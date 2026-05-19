import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ILdapAuthAdapter } from '../../application/auth/ports/ldap-auth.adapter';

/**
 * LDAP Service
 *
 * Реализация ILdapAuthAdapter, работающая через БД.
 * Настройки читаются из IntegrationSettings (id='ldap') лениво — при первом запросе.
 * Никаких операций при старте приложения.
 *
 * В mock-режиме (useMock = true) — проверка пароля для admin/adminnimda.
 * В реальном режиме (useMock = false) — LDAP bind.
 */
@Injectable()
export class LdapService implements ILdapAuthAdapter {
  private readonly logger = new Logger(LdapService.name);
  private host = '';
  private port = 389;
  private baseDn = 'OU=Users,DC=company,DC=com';
  private useMock = true;
  private tlsEnabled = false;
  private configLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Конструктор синхронный — ничего не делает с БД
  }

  private async loadConfig(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._load().finally(() => {
      this.loadingPromise = null;
    });
    return this.loadingPromise;
  }

  private async _load(): Promise<void> {
    try {
      const settings = await this.prisma.integrationSettings.findUnique({
        where: { id: 'ldap' },
      });
      if (settings?.extensions) {
        const ext = settings.extensions as Record<string, unknown>;
        if (ext.host) this.host = String(ext.host);
        if (ext.port !== undefined) this.port = Number(ext.port) || 389;
        if (ext.baseDn) this.baseDn = String(ext.baseDn);
        if (ext.useMock !== undefined) this.useMock = ext.useMock !== false;
        if (ext.tlsEnabled !== undefined) this.tlsEnabled = ext.tlsEnabled === true;
      }
      // Если записи нет — остаются значения по умолчанию (mock)
      this.configLoaded = true;
    } catch (error) {
      this.logger.error(`LDAP config load failed: ${(error as Error).message}`);
      this.useMock = true;
      this.configLoaded = true;
    }
  }

  async reloadConfig(): Promise<void> {
    this.configLoaded = false;
    await this.loadConfig();
  }

  async authenticate(
    login: string,
    password: string,
  ): Promise<{ success: boolean; userDetails?: { dn: string; cn: string; mail: string } }> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }

    if (this.useMock) {
      const mockPasswords: Record<string, string> = { admin: 'adminnimda' };
      const expected = mockPasswords[login];
      if (expected) {
        if (password !== expected) {
          this.logger.warn(`Mock LDAP: bad password for "${login}"`);
          return { success: false };
        }
      } else if (!password || password.trim().length === 0) {
        this.logger.warn(`Mock LDAP: empty password for "${login}"`);
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

    // Real LDAP bind
    if (!password || password.trim().length === 0) return { success: false };
    try {
      const ldap = await import('ldapjs');
      const userDn = `CN=${login},${this.baseDn}`;
      return new Promise((resolve) => {
        const client = ldap.createClient({
          url: this.tlsEnabled
            ? `ldaps://${this.host}:${this.port}`
            : `ldap://${this.host}:${this.port}`,
          connectTimeout: 10000,
          timeout: 15000,
        });
        client.on('error', () => {
          client.destroy();
          resolve({ success: false });
        });
        client.bind(userDn, password, (err: Error | null) => {
          if (err) {
            client.destroy();
            resolve({ success: false });
            return;
          }
          resolve({
            success: true,
            userDetails: { dn: userDn, cn: login, mail: `${login}@company.com` },
          });
        });
      });
    } catch {
      return { success: false };
    }
  }

  isConfigured(): boolean {
    return this.useMock || !!(this.host && this.port);
  }
}
