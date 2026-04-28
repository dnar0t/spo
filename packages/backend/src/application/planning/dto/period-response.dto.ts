/**
 * PeriodResponseDto
 *
 * DTO для ответа API с данными отчётного периода.
 * Все значения преобразованы в «человеческие» единицы:
 * - проценты выводятся как число (например, 20.5 для 20.5%)
 * - время выводится в часах
 * - пороги выводятся в процентах
 */
import { ReportingPeriod } from '../../../domain/entities/reporting-period.entity';
import { Percentage } from '../../../domain/value-objects/percentage.vo';

export class PeriodResponseDto {
  readonly id: string;
  readonly month: number;
  readonly year: number;
  readonly state: string;
  readonly workHoursPerMonth: number | null;
  readonly reservePercent: number | null;
  readonly testPercent: number | null;
  readonly debugPercent: number | null;
  readonly mgmtPercent: number | null;
  readonly yellowThreshold: number | null;
  readonly redThreshold: number | null;
  readonly businessGroupingLevel: string | null;
  readonly employeeFilter: string[] | null;
  readonly projectFilter: string[] | null;
  readonly priorityFilter: string[] | null;
  readonly createdById: string;
  readonly closedAt: string | null;
  readonly reopenedAt: string | null;
  readonly reopenReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(data: PeriodResponseDto) {
    Object.assign(this, data);
  }

  /**
   * Создать DTO из доменной сущности ReportingPeriod.
   * Проценты из basis points преобразуются в проценты (число с плавающей точкой).
   */
  static fromDomain(period: ReportingPeriod): PeriodResponseDto {
    const safePercent = (p: Percentage | null): number | null =>
      p !== null ? p.percent : null;

    return new PeriodResponseDto({
      id: period.id,
      month: period.month,
      year: period.year,
      state: period.state.value,
      workHoursPerMonth: period.workHoursPerMonth,
      reservePercent: safePercent(period.reservePercent),
      testPercent: safePercent(period.testPercent),
      debugPercent: safePercent(period.debugPercent),
      mgmtPercent: safePercent(period.mgmtPercent),
      yellowThreshold: safePercent(period.yellowThreshold),
      redThreshold: safePercent(period.redThreshold),
      businessGroupingLevel: period.businessGroupingLevel,
      employeeFilter: period.employeeFilter,
      projectFilter: period.projectFilter,
      priorityFilter: period.priorityFilter,
      createdById: period.createdById,
      closedAt: period.closedAt?.toISOString() ?? null,
      reopenedAt: period.reopenedAt?.toISOString() ?? null,
      reopenReason: period.reopenReason,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString(),
    });
  }
}
