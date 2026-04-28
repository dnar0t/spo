/**
 * ExportAuditLogUseCase
 *
 * Экспорт аудит-лога в Excel формат.
 * Создаёт задачу на экспорт, генерирует файл и возвращает URL для скачивания.
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ExportJob } from '../../../domain/entities/export-job.entity';
import { IExportService } from '../ports/export-service';
import { IFileStorage } from '../ports/file-storage';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface ExportAuditLogParams {
  periodId?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  requesterUserId: string;
}

export interface ExportAuditLogResult {
  jobId: string;
  downloadUrl: string;
  fileName: string;
  status: string;
}

export class ExportAuditLogUseCase {
  constructor(
    private readonly exportJobRepository: ExportJobRepository,
    private readonly exportService: IExportService,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(params: ExportAuditLogParams): Promise<ExportAuditLogResult> {
    const { requesterUserId, ...auditParams } = params;

    // 1. Создаём задачу на экспорт
    const exportJob = ExportJob.create({
      exportType: 'AUDIT_LOG',
      format: 'XLSX',
      userId: requesterUserId,
      periodId: null,
    });

    const savedJob = await this.exportJobRepository.save(exportJob);

    try {
      // 2. Переводим в PROCESSING
      savedJob.start();
      await this.exportJobRepository.update(savedJob);

      // 3. Генерируем файл
      const buffer = await this.exportService.exportAuditLog(auditParams);

      // 4. Сохраняем файл
      const timestamp = Date.now();
      const fileName = `audit-log-${timestamp}.xlsx`;
      const filePath = await this.fileStorage.save(fileName, buffer);

      // 5. Завершаем задачу
      savedJob.complete(filePath, fileName);
      await this.exportJobRepository.update(savedJob);

      // 6. Возвращаем результат
      return {
        jobId: savedJob.id,
        downloadUrl: this.fileStorage.getPublicUrl(filePath),
        fileName,
        status: savedJob.status,
      };
    } catch (error) {
      savedJob.fail((error as Error).message);
      await this.exportJobRepository.update(savedJob);
      throw error;
    }
  }
}
