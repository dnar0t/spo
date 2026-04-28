/**
 * ExportSummaryReportUseCase
 *
 * Экспорт сводного отчёта периода в Excel/PDF.
 * - Проверяет существование периода
 * - Проверяет, что период не в состоянии PLANNING
 * - Генерирует файл через IExportService
 * - Сохраняет файл через IFileStorage
 * - Создаёт ExportJob с результатом
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { ExportJob } from '../../../domain/entities/export-job.entity';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';
import { IExportService } from '../ports/export-service';
import { IFileStorage } from '../ports/file-storage';

export interface ExportSummaryReportParams {
  periodId: string;
  format: 'XLSX' | 'PDF';
  userId: string;
}

export interface ExportSummaryReportResult {
  jobId: string;
  downloadUrl: string;
  fileName: string;
}

export class ExportSummaryReportUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly exportJobRepository: ExportJobRepository,
    private readonly exportService: IExportService,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(params: ExportSummaryReportParams): Promise<ExportSummaryReportResult> {
    const { periodId, format, userId } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не в состоянии PLANNING
    if (period.isPlanning()) {
      throw new DomainStateError(
        'Cannot export summary report for a period in PLANNING state',
        { periodId, state: period.state.value },
      );
    }

    // 3. Создаём задачу экспорта
    const exportJob = ExportJob.create({
      exportType: 'SUMMARY_REPORT',
      format,
      userId,
      periodId,
    });
    exportJob.start();
    await this.exportJobRepository.save(exportJob);

    try {
      // 4. Генерируем файл
      const buffer = await this.exportService.exportSummaryReport(periodId);

      // 5. Формируем имя файла
      const ext = format === 'XLSX' ? 'xlsx' : 'pdf';
      const fileName = `summary-report-${period.month}-${period.year}-${Date.now()}.${ext}`;

      // 6. Сохраняем файл
      const filePath = await this.fileStorage.save(fileName, buffer);

      // 7. Завершаем задачу
      exportJob.complete(filePath, fileName);
      await this.exportJobRepository.update(exportJob);

      // 8. Возвращаем результат
      return {
        jobId: exportJob.id,
        downloadUrl: this.fileStorage.getPublicUrl(filePath),
        fileName,
      };
    } catch (error) {
      exportJob.fail((error as Error).message);
      await this.exportJobRepository.update(exportJob);
      throw error;
    }
  }
}
