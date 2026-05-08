/**
 * GetIntegrationsUseCase
 *
 * Use case для получения списка интеграций.
 * Возвращает данные в формате IntegrationDto, ожидаемом фронтендом.
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
    return settings.map((s) => ({
      id: s.id,
      name: s.id === 'integration-default' ? 'YouTrack' : 'Интеграция',
      description: 'Интеграция с внешней системой для синхронизации данных.',
      status: s.isActive ? 'connected' : 'disconnected',
      baseUrl: s.baseUrl || null,
      secretMask: s.apiTokenEncrypted ? '••••••••' : null,
      lastSyncAt: null, // В модели IntegrationSettings нет поля lastSync
      notes: s.projects?.length ? `Проекты: ${s.projects.join(', ')}` : null,
    }));
  }
}
