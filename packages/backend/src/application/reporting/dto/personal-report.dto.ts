/**
 * PersonalReportDto
 *
 * DTO для ответа API с личным отчётом сотрудника за период.
 */
import { PersonalReport } from '../../../domain/entities/personal-report.entity';

export class PersonalReportDto {
  readonly userId: string;
  readonly fullName: string | null;
  readonly periodId: string;
  readonly lines: PersonalReportLineDto[];
  readonly totals: PersonalReportTotalsDto;

  private constructor(data: PersonalReportDto) {
    Object.assign(this, data);
  }

  static fromDomain(params: {
    userId: string;
    fullName: string | null;
    periodId: string;
    lines: PersonalReportLineDto[];
    totals: PersonalReportTotalsDto;
  }): PersonalReportDto {
    return new PersonalReportDto(params);
  }
}

export class PersonalReportLineDto {
  readonly issueNumber: string;
  readonly summary: string;
  readonly stateName: string | null;
  readonly parentIssueNumber: string | null;
  readonly estimationHours: number;
  readonly actualHours: number;
  readonly baseAmount: number;
  readonly managerPercent: number | null;
  readonly managerAmount: number;
  readonly businessPercent: number | null;
  readonly businessAmount: number;
  readonly totalOnHand: number;
  readonly ndfl: number;
  readonly insurance: number;
  readonly reserveVacation: number;
  readonly totalWithTax: number;
  readonly effectiveRate: number | null;

  constructor(data: PersonalReportLineDto) {
    Object.assign(this, data);
  }

  static fromDomain(report: PersonalReport): PersonalReportLineDto {
    return new PersonalReportLineDto({
      issueNumber: report.issueNumber,
      summary: report.summary,
      stateName: report.stateName,
      parentIssueNumber: report.parentIssueNumber,
      estimationHours: report.estimationMinutes?.hours ?? 0,
      actualHours: report.actualMinutes?.hours ?? 0,
      baseAmount: report.baseAmount?.rubles ?? 0,
      managerPercent: report.managerPercent?.percent ?? null,
      managerAmount: report.managerAmount?.rubles ?? 0,
      businessPercent: report.businessPercent?.percent ?? null,
      businessAmount: report.businessAmount?.rubles ?? 0,
      totalOnHand: report.totalOnHand?.rubles ?? 0,
      ndfl: report.ndfl?.rubles ?? 0,
      insurance: report.insurance?.rubles ?? 0,
      reserveVacation: report.reserveVacation?.rubles ?? 0,
      totalWithTax: report.totalWithTax?.rubles ?? 0,
      effectiveRate: report.effectiveRate,
    });
  }
}

export class PersonalReportTotalsDto {
  readonly totalBaseAmount: number;
  readonly totalManagerAmount: number;
  readonly totalBusinessAmount: number;
  readonly totalOnHand: number;
  readonly totalNdfl: number;
  readonly totalInsurance: number;
  readonly totalReserve: number;
  readonly totalWithTax: number;
  readonly totalHours: number;

  constructor(data: PersonalReportTotalsDto) {
    Object.assign(this, data);
  }

  static fromDomain(lines: PersonalReport[]): PersonalReportTotalsDto {
    const sum = (getter: (r: PersonalReport) => number) =>
      lines.reduce((acc, r) => acc + getter(r), 0);

    return new PersonalReportTotalsDto({
      totalBaseAmount: sum(r => r.baseAmount?.rubles ?? 0),
      totalManagerAmount: sum(r => r.managerAmount?.rubles ?? 0),
      totalBusinessAmount: sum(r => r.businessAmount?.rubles ?? 0),
      totalOnHand: sum(r => r.totalOnHand?.rubles ?? 0),
      totalNdfl: sum(r => r.ndfl?.rubles ?? 0),
      totalInsurance: sum(r => r.insurance?.rubles ?? 0),
      totalReserve: sum(r => r.reserveVacation?.rubles ?? 0),
      totalWithTax: sum(r => r.totalWithTax?.rubles ?? 0),
      totalHours: sum(r => r.actualMinutes?.hours ?? 0),
    });
  }
}
