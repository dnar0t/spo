/**
 * PeriodStatisticsDto
 *
 * DTO для ответа API со статистикой периода.
 */
export class PeriodStatisticsDto {
  readonly totalPlannedHours: number;
  readonly totalActualHours: number;
  readonly deviation: number;
  readonly completionPercent: number;
  readonly unplannedHours: number;
  readonly unplannedPercent: number;
  readonly remainingHours: number;
  readonly unfinishedTasks: number;

  private constructor(data: PeriodStatisticsDto) {
    Object.assign(this, data);
  }

  static fromDomain(statistics: {
    totalPlannedMinutes: { hours: number };
    totalActualMinutes: { hours: number };
    deviation: { hours: number };
    completionPercent: { percent: number };
    unplannedMinutes: { hours: number };
    unplannedPercent: { percent: number };
    remainingMinutes: { hours: number };
    unfinishedTasks: number;
  }): PeriodStatisticsDto {
    return new PeriodStatisticsDto({
      totalPlannedHours: statistics.totalPlannedMinutes.hours,
      totalActualHours: statistics.totalActualMinutes.hours,
      deviation: statistics.deviation.hours,
      completionPercent: statistics.completionPercent.percent,
      unplannedHours: statistics.unplannedMinutes.hours,
      unplannedPercent: statistics.unplannedPercent.percent,
      remainingHours: statistics.remainingMinutes.hours,
      unfinishedTasks: statistics.unfinishedTasks,
    });
  }
}
