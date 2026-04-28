/**
 * SummaryReportDto
 *
 * DTO для ответа API с итоговым отчётом периода.
 */
import { SummaryReport } from '../../../domain/entities/summary-report.entity';
import { PeriodStatisticsResult, GroupedReport } from '../../../domain/services/report-calculator.service';

export class SummaryReportDto {
  readonly period: {
    id: string;
    month: number;
    year: number;
    state: string;
  };
  readonly statistics: {
    totalPlannedHours: number;
    totalActualHours: number;
    deviation: number;
    completionPercent: number;
    unplannedHours: number;
    unplannedPercent: number;
    remainingHours: number;
    unfinishedTasks: number;
  };
  readonly groups: GroupedReportDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;

  private constructor(data: SummaryReportDto) {
    Object.assign(this, data);
  }

  static fromDomain(params: {
    period: { id: string; month: number; year: number; state: string };
    statistics: PeriodStatisticsResult;
    groups: GroupedReportDto[];
    page: number;
    pageSize: number;
    total: number;
  }): SummaryReportDto {
    const { period, statistics, groups, page, pageSize, total } = params;
    return new SummaryReportDto({
      period,
      statistics: {
        totalPlannedHours: statistics.totalPlannedMinutes.hours,
        totalActualHours: statistics.totalActualMinutes.hours,
        deviation: statistics.deviation.hours,
        completionPercent: statistics.completionPercent.percent,
        unplannedHours: statistics.unplannedMinutes.hours,
        unplannedPercent: statistics.unplannedPercent.percent,
        remainingHours: statistics.remainingMinutes.hours,
        unfinishedTasks: statistics.unfinishedTasks,
      },
      groups,
      page,
      pageSize,
      total,
    });
  }
}

export class GroupedReportDto {
  readonly systemName: string;
  readonly plannedHours: number;
  readonly actualHours: number;
  readonly items: SummaryReportLineDto[];

  constructor(data: GroupedReportDto) {
    Object.assign(this, data);
  }

  static fromDomain(group: GroupedReport): GroupedReportDto {
    return new GroupedReportDto({
      systemName: group.systemName,
      plannedHours: group.plannedMinutes / 60,
      actualHours: group.actualMinutes / 60,
      items: group.items.map(SummaryReportLineDto.fromDomain),
    });
  }
}

export class SummaryReportLineDto {
  readonly issueNumber: string;
  readonly summary: string;
  readonly typeName: string | null;
  readonly priorityName: string | null;
  readonly stateName: string | null;
  readonly assigneeName: string | null;
  readonly isPlanned: boolean;
  readonly readinessPercent: number | null;
  readonly plannedHours: number;
  readonly actualHours: number;
  readonly remainingHours: number;
  readonly plannedCost: number | null;
  readonly actualCost: number | null;
  readonly remainingCost: number | null;
  readonly businessEvaluationType: string | null;
  readonly managerEvaluationType: string | null;

  constructor(data: SummaryReportLineDto) {
    Object.assign(this, data);
  }

  static fromDomain(report: SummaryReport): SummaryReportLineDto {
    return new SummaryReportLineDto({
      issueNumber: report.issueNumber,
      summary: report.summary,
      typeName: report.typeName,
      priorityName: report.priorityName,
      stateName: report.stateName,
      assigneeName: report.assigneeName,
      isPlanned: report.isPlanned,
      readinessPercent: report.readinessPercent?.percent ?? null,
      plannedHours: report.totalPlannedMinutes.hours,
      actualHours: report.totalActualMinutes.hours,
      remainingHours: report.remainingMinutes?.hours ?? 0,
      plannedCost: report.plannedCost?.rubles ?? null,
      actualCost: report.actualCost?.rubles ?? null,
      remainingCost: report.remainingCost?.rubles ?? null,
      businessEvaluationType: report.businessEvaluationType,
      managerEvaluationType: report.managerEvaluationType,
    });
  }
}
