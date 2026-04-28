/**
 * ExportJsonAccountingUseCase
 *
 * Экспорт JSON для бухгалтерии.
 * Генерирует структурированный JSON с данными периода для интеграции с бухгалтерской системой.
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { ExportJob } from '../../../domain/entities/export-job.entity';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';
import { IExportService } from '../ports/export-service';
import { IFileStorage } from '../ports/file-storage';

export interface ExportJsonAccountingParams {
  periodId: string;
  userId: string;
}

export interface ExportJsonAccountingResult {
  jobId: string;
  downloadUrl: string;
  fileName: string;
}

export class ExportJsonAccountingUseCase {
  constructor(
    private readonly exportJobRepository: ExportJobRepository,
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly exportService: IExportService,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(params: ExportJsonAccountingParams): Promise<ExportJsonAccountingResult> {
    const { periodId, userId } = params;

    // 1. Проверяем, что период существует и не в состоянии PLANNING
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }
    if (period.isPlanning()) {
      throw new DomainStateError(
        'Cannot export accounting data for a period in PLANNING state. ' +
        'The plan must be finalized first.',
        { periodId, currentState: period.state.value },
      );
    }

    // 2. Создаём задачу на экспорт
    const exportJob = ExportJob.create({
      exportType: 'JSON_ACCOUNTING',
      format: 'JSON',
      userId,
      periodId,
    });

    const savedJob = await this.exportJobRepository.save(exportJob);

    try {
      // 3. Начинаем обработку
      savedJob.start();
      await this.exportJobRepository.update(savedJob);

      // 4. Генерируем JSON
      const buffer = await this.exportService.exportJsonAccounting(periodId);

      // 5. Сохраняем файл
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `accounting-${periodId}-${timestamp}.json`;
      const filePath = await this.fileStorage.save(fileName, buffer);

      // 6. Завершаем задачу
      savedJob.complete(filePath, fileName);
      await this.exportJobRepository.update(savedJob);

      return {
        jobId: savedJob.id,
        downloadUrl: this.fileStorage.getPublicUrl(filePath),
        fileName,
      };
    } catch (error) {
      savedJob.fail((error as Error).message);
      await this.exportJobRepository.update(savedJob);
      throw error;
    }
  }
}
