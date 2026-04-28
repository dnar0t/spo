/**
 * ExportPersonalReportUseCase
 *
 * Экспорт личного отчёта сотрудника за период в Excel/PDF.
 * Создаёт задачу на экспорт, генерирует файл, сохраняет и возвращает URL для скачивания.
 */
import { ExportJobRepository } from '../../../domain/repositories/export-job.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ExportJob, ExportFormat } from '../../../domain/entities/export-job.entity';
import { IExportService } from '../ports/export-service';
import { IFileStorage } from '../ports/file-storage';
import { NotFoundError, DomainStateError, UnauthorizedError } from '../../../domain/errors/domain.error';
import * as path from 'path';

export interface ExportPersonalReportParams {
  periodId: string;
  userId: string;
  format: ExportFormat;
  currentUserId: string;
}

export interface ExportPersonalReportResult {
  jobId: string;
  status: string;
  downloadUrl: string | null;
}

export class ExportPersonalReportUseCase {
  constructor(
    private readonly exportJobRepository: ExportJobRepository,
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly userRepository: UserRepository,
    private readonly exportService: IExportService,
    private readonly fileStorage: IFileStorage,
  ) {}

  async execute(params: ExportPersonalReportParams): Promise<ExportPersonalReportResult> {
    const { periodId, userId, format, currentUserId } = params;

    // 1. Проверяем, что период существует и не в состоянии PLANNING
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    if (period.isPlanning()) {
      throw new DomainStateError(
        'Cannot export report for a period in PLANNING state. Complete planning first.',
        { periodId, state: period.state.value },
      );
    }

    // 2. Проверяем, что пользователь существует
    const targetUser = await this.userRepository.findById(userId);
    if (!targetUser) {
      throw new NotFoundError('User', userId);
    }

    // 3. Проверяем, что есть данные для экспорта
    const personalReports = await this.personalReportRepository.findByPeriodAndUserId(periodId, userId);
    if (personalReports.length === 0) {
      throw new NotFoundError('PersonalReport', `No personal reports found for period ${periodId} and user ${userId}`);
    }

    // 4. Создаём задачу на экспорт
    const exportJob = ExportJob.create({
      exportType: 'PERSONAL_REPORT',
      format,
      userId: currentUserId,
      periodId,
    });

    const savedJob = await this.exportJobRepository.save(exportJob);

    try {
      // 5. Переводим в PROCESSING
      savedJob.start();
      await this.exportJobRepository.update(savedJob);

      // 6. Генерируем файл
      const buffer = await this.exportService.exportPersonalReport(periodId, userId);

      // 7. Сохраняем файл
      const extension = format.toLowerCase();
      const fileName = `personal-report_${periodId}_${userId}_${Date.now()}.${extension}`;
      const filePath = await this.fileStorage.save(fileName, buffer);

      // 8. Завершаем задачу
      savedJob.complete(filePath, fileName);
      await this.exportJobRepository.update(savedJob);

      const downloadUrl = this.fileStorage.getPublicUrl(filePath);

      return {
        jobId: savedJob.id,
        status: savedJob.status,
        downloadUrl,
      };
    } catch (error) {
      savedJob.fail((error as Error).message);
      await this.exportJobRepository.update(savedJob);

      return {
        jobId: savedJob.id,
        status: savedJob.status,
        downloadUrl: null,
      };
    }
  }
}
