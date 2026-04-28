/**
 * GenerateSummaryReportUseCase
 *
 * Генерирует итоговый отчёт периода на основе личных отчётов сотрудников.
 * 1. Собирает все PersonalReport периода
 * 2. Агрегирует по задачам
 * 3. Группирует по выбранному уровню
 * 4. Сохраняет SummaryReport records
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface GenerateSummaryReportParams {
  periodId: string;
  groupByLevel?: string;
}

export class GenerateSummaryReportUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: GenerateSummaryReportParams): Promise<{ generatedCount: number }> {
    const { periodId, groupByLevel } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все личные отчёты периода
    const personalReports = await this.personalReportRepository.findByPeriodId(periodId);

    if (personalReports.length === 0) {
      return { generatedCount: 0 };
    }

    // 3. Определяем уровень группировки
    const level = groupByLevel ?? period.businessGroupingLevel ?? 'STORY';

    // 4. Удаляем старые записи итогового отчёта
    await this.summaryReportRepository.deleteByPeriodId(periodId);

    // 5. Генерируем строки итогового отчёта
    const summaryLines = this.reportCalculator.generateSummaryLines({
      period,
      personalReports,
      groupByLevel: level,
    });

    // 6. Сохраняем
    if (summaryLines.length > 0) {
      await this.summaryReportRepository.saveMany(summaryLines);
    }

    return {
      generatedCount: summaryLines.length,
    };
  }
}
