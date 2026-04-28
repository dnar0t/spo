/**
 * ExportPlanUseCase
 *
 * Экспорт плана периода в Excel/PDF.
 * - Проверяет существование периода
 * - Проверяет, что период не в состоянии PLANNING (нельзя экспортировать пустой план)
 * - Создаёт задачу на экспорт (ExportJob)
 * - Генерирует файл через IExportService
 * - Сохраняет файл через IFileStorage
 * - Возвращает download URL
 */
import { ExportJob } from '../../../domain/entities/export-job.entity';
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { IExportService } from '../ports/export-service';
import { IFileStorage } from '../ports/file-storage';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface ExportPlanParams {
  periodId: string;
  format: 'XLSX' | 'PDF';
  userId: string;
}

export interface ExportPlanResult {
  jobId: string;
  downloadUrl: string | null;
  status: string;
}

export class ExportPlanUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly exportJobRepository: ExportJobRepository,
    private readonly exportService: IExportService,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(params: ExportPlanParams): Promise<ExportPlanResult> {
    const { periodId, format, userId } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не в состоянии PLANNING (нельзя экспортировать пустой план)
    if (period.isPlanning()) {
      throw new DomainStateError(
        'Cannot export plan while period is in PLANNING state. ' +
        'The plan must be finalized first.',
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Создаём задачу на экспорт
    const exportJob = ExportJob.create({
      exportType: 'PLAN',
      format,
      userId,
      periodId,
    });

    const savedJob = await this.exportJobRepository.save(exportJob);

    // 4. Запускаем обработку
    savedJob.start();

    try {
      // 5. Генерируем файл
      const buffer = await this.exportService.exportPlan(periodId);

      // 6. Формируем имя файла
      const fileName = `plan_${periodId}_${period.month}_${period.year}_${Date.now()}.${format.toLowerCase()}`;

      // 7. Сохраняем файл
      const filePath = await this.fileStorage.save(fileName, buffer);

      // 8. Завершаем задачу
      savedJob.complete(filePath, fileName);
      await this.exportJobRepository.update(savedJob);

      // 9. Получаем download URL
      const downloadUrl = this.fileStorage.getPublicUrl(filePath);

      return {
        jobId: savedJob.id,
        downloadUrl,
        status: savedJob.status,
      };
    } catch (error) {
      savedJob.fail((error as Error).message);
      await this.exportJobRepository.update(savedJob);

      return {
        jobId: savedJob.id,
        downloadUrl: null,
        status: savedJob.status,
      };
    }
  }
}
