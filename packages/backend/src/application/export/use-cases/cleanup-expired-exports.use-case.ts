/**
 * CleanupExpiredExportsUseCase
 *
 * Use case для очистки истекших экспортных файлов.
 * Удаляет файлы с истекшим сроком хранения из хранилища и помечает задачи как FAILED.
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { IFileStorage } from '../ports/file-storage';

export interface CleanupExpiredExportsResult {
  removedCount: number;
}

export class CleanupExpiredExportsUseCase {
  constructor(
    private readonly exportJobRepository: ExportJobRepository,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(): Promise<CleanupExpiredExportsResult> {
    const expiredJobs = await this.exportJobRepository.findExpired();
    let removedCount = 0;

    for (const job of expiredJobs) {
      try {
        if (job.filePath) {
          await this.fileStorage.delete(job.filePath);
        }
        job.fail('Export file expired and has been cleaned up');
        await this.exportJobRepository.update(job);
        removedCount++;
      } catch {
        // Log and continue — cleanup should not break the whole process
        job.fail('Export file expired, cleanup attempted but file deletion failed');
        await this.exportJobRepository.update(job);
        removedCount++;
      }
    }

    return { removedCount };
  }
}
