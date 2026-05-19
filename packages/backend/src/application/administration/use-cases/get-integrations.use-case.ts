/**
 * GetIntegrationsUseCase
 *
 * Use case для получения списка интеграций.
 * Возвращает данные в формате IntegrationDto, ожидаемом фронтендом.
 *
 * Поддерживаемые интеграции:
 * - YouTrack (id: 'integration-default') — синхронизация задач
 * - LDAP / AD (id: 'ldap') — аутентификация через корпоративный каталог
 */
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface IntegrationDto {
  id: string;
  name: string;
  description: string;
  status: string;
  baseUrl: string | null;
  secretMask: string | null;
  lastSyncAt: string | null;
  notes: string | null;
}

export class GetIntegrationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<IntegrationDto[]> {
    const settings = await this.prisma.integrationSettings.findMany();

    // Если настроек нет — возвращаем заглушки для YouTrack и LDAP
    if (settings.length === 0) {
      return [
        {
          id: 'youtrack',
          name: 'YouTrack',
          description: 'Интеграция с YouTrack для синхронизации задач, work items и пользователей.',
          status: 'disconnected',
          baseUrl: null,
          secretMask: null,
          lastSyncAt: null,
          notes: null,
        },
        {
          id: 'ldap',
          name: 'LDAP / AD',
          description: 'Подключение к корпоративному каталогу для аутентификации пользователей.',
          status: 'disconnected',
          baseUrl: null,
          secretMask: null,
          lastSyncAt: null,
          notes: null,
        },
      ];
    }

    // Маппим существующие настройки в IntegrationDto
    return settings.map(
      (s: {
        id: string;
        baseUrl: string;
        apiTokenEncrypted: string;
        isActive: boolean;
        updatedAt: Date | null;
        extensions: unknown;
        projects: unknown;
      }) => {
        const extensions =
          typeof s.extensions === 'object' && s.extensions !== null
            ? (s.extensions as Record<string, unknown>)
            : {};

        // Определяем имя и описание по ID записи
        let name: string;
        let description: string;
        let baseUrl: string | null;
        let secretMask: string | null;

        if (s.id === 'ldap') {
          name = 'LDAP / AD';
          description = 'Подключение к корпоративному каталогу для аутентификации пользователей.';
          baseUrl = extensions.host ? `${extensions.host}:${extensions.port || 389}` : null;
          secretMask = extensions.bindPassword ? '••••••••' : null;
        } else {
          name = 'YouTrack';
          description =
            'Интеграция с YouTrack для синхронизации задач, work items и пользователей.';
          baseUrl = s.baseUrl || null;
          secretMask = s.apiTokenEncrypted ? '••••••••' : null;
        }

        return {
          id: s.id,
          name,
          description,
          status: s.isActive ? 'connected' : 'disconnected',
          baseUrl,
          secretMask,
          lastSyncAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
          notes: (extensions.notes as string) || null,
        };
      },
    );
  }
}
