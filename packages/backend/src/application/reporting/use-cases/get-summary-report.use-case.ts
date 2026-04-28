/**
 * GetSummaryReportUseCase
 *
 * Получение итогового отчёта с фильтрацией, сортировкой и пагинацией.
 * Поддерживает фильтры: system, groupBy, isPlanned, search, sortField, sortOrder.
 */
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { SummaryReport } from '../../../domain/entities/summary-report.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { SummaryReportDto, GroupedReportDto } from '../dto/summary-report.dto';
import { PeriodStatisticsDto } from '../dto/period-statistics.dto';

export interface GetSummaryReportParams {
  periodId: string;
  system?: string;
  groupBy?: string;
  isPlanned?: boolean;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface GetSummaryReportResult {
  summary: SummaryReportDto;
  statistics: PeriodStatisticsDto;
}

export class GetSummaryReportUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: GetSummaryReportParams): Promise<GetSummaryReportResult> {
    const {
      periodId,
      system,
      groupBy = 'SYSTEM',
      isPlanned,
      search,
      sortField = 'plannedMinutes',
      sortOrder = 'desc',
      page = 1,
      pageSize = 50,
    } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все строки итогового отчёта
    let lines = await this.summaryReportRepository.findByPeriodId(periodId);

    // 3. Фильтрация
    if (system) {
      lines = lines.filter(l => l.systemName === system);
    }

    if (isPlanned !== undefined) {
      lines = lines.filter(l => l.isPlanned === isPlanned);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      lines = lines.filter(l =>
        l.issueNumber.toLowerCase().includes(searchLower) ||
        l.summary.toLowerCase().includes(searchLower),
      );
    }

    // 4. Сортировка
    lines = this.sortLines(lines, sortField, sortOrder);

    // 5. Пагинация
    const total = lines.length;
    const offset = (page - 1) * pageSize;
    const paginatedLines = lines.slice(offset, offset + pageSize);

    // 6. Группировка
    const grouped = this.reportCalculator.groupReport(paginatedLines, groupBy);
    const groupsDto = grouped.map(GroupedReportDto.fromDomain);

    // 7. Статистика
    const statistics = this.reportCalculator.calculateStatistics(paginatedLines);
    const statisticsDto = PeriodStatisticsDto.fromDomain(statistics);

    // 8. Формируем ответ
    const summaryDto = SummaryReportDto.fromDomain({
      period: {
        id: period.id,
        month: period.month,
        year: period.year,
        state: period.state.value,
      },
      statistics,
      groups: groupsDto,
      page,
      pageSize,
      total,
    });

    return {
      summary: summaryDto,
      statistics: statisticsDto,
    };
  }

  /**
   * Сортировка строк отчёта по указанному полю.
   */
  private sortLines(lines: SummaryReport[], sortField: string, sortOrder: 'asc' | 'desc'): SummaryReport[] {
    const multiplier = sortOrder === 'desc' ? -1 : 1;

    return [...lines].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'plannedMinutes':
          comparison = a.totalPlannedMinutes.minutes - b.totalPlannedMinutes.minutes;
          break;
        case 'actualMinutes':
          comparison = a.totalActualMinutes.minutes - b.totalActualMinutes.minutes;
          break;
        case 'plannedHours':
          comparison = a.totalPlannedMinutes.minutes - b.totalPlannedMinutes.minutes;
          break;
        case 'actualHours':
          comparison = a.totalActualMinutes.minutes - b.totalActualMinutes.minutes;
          break;
        case 'remainingMinutes':
          comparison = (a.remainingMinutes?.minutes ?? 0) - (b.remainingMinutes?.minutes ?? 0);
          break;
        case 'completionPercent':
          comparison = (a.readinessPercent?.basisPoints ?? 0) - (b.readinessPercent?.basisPoints ?? 0);
          break;
        case 'issueNumber':
          comparison = a.issueNumber.localeCompare(b.issueNumber);
          break;
        case 'summary':
          comparison = a.summary.localeCompare(b.summary);
          break;
        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });
  }
}
