/**
 * GetIntegrationsUseCase
 *
 * Use case для получения списка всех IntegrationSettings.
 */
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export class GetIntegrationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const integrations = await this.prisma.integrationSettings.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return integrations.map((integration) => ({
      id: integration.id,
      baseUrl: integration.baseUrl,
      projects: integration.projects,
      searchQuery: integration.searchQuery,
      agileBoardId: integration.agileBoardId,
      sprintFieldId: integration.sprintFieldId,
      syncInterval: integration.syncInterval,
      batchSize: integration.batchSize,
      requestTimeout: integration.requestTimeout,
      retryCount: integration.retryCount,
      errorEmail: integration.errorEmail,
      isActive: integration.isActive,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    }));
  }
}
