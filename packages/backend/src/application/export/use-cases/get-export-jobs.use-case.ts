/**
 * GetExportJobsUseCase
 *
 * Получение задач на экспорт для текущего пользователя.
 * Возвращает отсортированный по дате создания список (от новых к старым).
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ExportJob } from '../../../domain/entities/export-job.entity';

export interface GetExportJobsParams {
  userId: string;
}

export interface GetExportJobsResult {
  jobs: Array<{
    id: string;
    exportType: string;
    format: string;
    status: string;
    periodId: string | null;
    fileName: string | null;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
    expiresAt: string;
    downloadUrl: string | null;
  }>;
}

export class GetExportJobsUseCase {
  constructor(private readonly exportJobRepository: ExportJobRepository) {}

  async execute(params: GetExportJobsParams): Promise<GetExportJobsResult> {
    const { userId } = params;

    const jobs = await this.exportJobRepository.findByUserId(userId);

    // Сортируем от новых к старым
    const sorted = [...jobs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      jobs: sorted.map((job) => ({
        id: job.id,
        exportType: job.exportType,
        format: job.format,
        status: job.status,
        periodId: job.periodId,
        fileName: job.fileName,
        error: job.error,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
        expiresAt: job.expiresAt.toISOString(),
        downloadUrl: job.filePath ? `/api/export/download/${job.id}` : null,
      })),
    };
  }
}
