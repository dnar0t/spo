/**
 * GetPeriodStatisticsUseCase
 *
 * Получение статистики выполнения плана за период.
 * Рассчитывает метрики на основе строк итогового отчёта.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { PeriodStatisticsDto } from '../dto/period-statistics.dto';

export interface GetPeriodStatisticsParams {
  periodId: string;
}

export class GetPeriodStatisticsUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: GetPeriodStatisticsParams): Promise<PeriodStatisticsDto> {
    const { periodId } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем строки итогового отчёта
    const lines = await this.summaryReportRepository.findByPeriodId(periodId);

    // 3. Рассчитываем статистику
    const statistics = this.reportCalculator.calculateStatistics(lines);

    // 4. Формируем DTO
    return PeriodStatisticsDto.fromDomain(statistics);
  }
}
