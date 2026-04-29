/**
 * PrismaPersonalReportRepository
 *
 * Prisma-реализация репозитория PersonalReportRepository.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { PersonalReport } from '../../../domain/entities/personal-report.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaPersonalReportRepository implements PersonalReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PersonalReport | null> {
    const data = await this.prisma.personalReport.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!data) return null;
    return this.toDomain(data, data.lines);
  }

  async findByPeriodId(periodId: string): Promise<PersonalReport[]> {
    const records = await this.prisma.personalReport.findMany({
      where: { periodId },
      include: { lines: true },
    });
    return records.map((r) => this.toDomain(r, r.lines));
  }

  async findByPeriodAndUserId(periodId: string, userId: string): Promise<PersonalReport[]> {
    const records = await this.prisma.personalReport.findMany({
      where: { periodId, userId },
      include: { lines: true },
    });
    return records.map((r) => this.toDomain(r, r.lines));
  }

  async findByPeriodAndIssue(periodId: string, youtrackIssueId: string): Promise<PersonalReport[]> {
    // Find all personal reports that have a line with the given youtrackIssueId
    const records = await this.prisma.personalReport.findMany({
      where: { periodId },
      include: {
        lines: {
          where: { youtrackIssueId },
        },
      },
    });
    // Only return reports that actually have matching lines
    return records.filter((r) => r.lines.length > 0).map((r) => this.toDomain(r, r.lines));
  }

  async save(entity: PersonalReport): Promise<PersonalReport> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.personalReport.create({
      data: {
        id: persistence.id as string,
        periodId: persistence.period_id as string,
        userId: persistence.user_id as string,
        totalBaseAmount: (persistence.base_amount as number) ?? 0,
        totalManagerAmount: (persistence.manager_amount as number) ?? 0,
        totalBusinessAmount: (persistence.business_amount as number) ?? 0,
        totalOnHand: (persistence.total_on_hand as number) ?? 0,
        totalNdfl: (persistence.ndfl as number) ?? 0,
        totalInsurance: (persistence.insurance as number) ?? 0,
        totalReserve: (persistence.reserve_vacation as number) ?? 0,
        totalWithTax: (persistence.total_with_tax as number) ?? 0,
        totalMinutes: (persistence.actual_minutes as number) ?? 0,
        isFrozen: false,
        createdAt: persistence.created_at as Date,
        updatedAt: persistence.updated_at as Date,
      },
      include: { lines: true },
    });
    return this.toDomain(data, data.lines);
  }

  async saveMany(entities: PersonalReport[]): Promise<void> {
    for (const entity of entities) {
      await this.save(entity);
    }
  }

  async update(entity: PersonalReport): Promise<PersonalReport> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.personalReport.update({
      where: { id: entity.id },
      data: {
        totalBaseAmount: (persistence.base_amount as number) ?? 0,
        totalManagerAmount: (persistence.manager_amount as number) ?? 0,
        totalBusinessAmount: (persistence.business_amount as number) ?? 0,
        totalOnHand: (persistence.total_on_hand as number) ?? 0,
        totalNdfl: (persistence.ndfl as number) ?? 0,
        totalInsurance: (persistence.insurance as number) ?? 0,
        totalReserve: (persistence.reserve_vacation as number) ?? 0,
        totalWithTax: (persistence.total_with_tax as number) ?? 0,
        totalMinutes: (persistence.actual_minutes as number) ?? 0,
      },
      include: { lines: true },
    });
    return this.toDomain(data, data.lines);
  }

  async updateMany(
    ids: string[],
    data: { isFrozen?: boolean; frozenAt?: Date | null },
  ): Promise<void> {
    await this.prisma.personalReport.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(data.isFrozen !== undefined && { isFrozen: data.isFrozen }),
        ...(data.frozenAt !== undefined && { frozenAt: data.frozenAt }),
      },
    });
  }

  async deleteByPeriodId(periodId: string): Promise<void> {
    // Delete all lines first, then the reports
    const reports = await this.prisma.personalReport.findMany({
      where: { periodId },
      select: { id: true },
    });
    for (const report of reports) {
      await this.prisma.personalReportLine.deleteMany({
        where: { personalReportId: report.id },
      });
    }
    await this.prisma.personalReport.deleteMany({
      where: { periodId },
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.personalReportLine.deleteMany({
        where: { personalReportId: id },
      });
      await this.prisma.personalReport.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('PersonalReport', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   * Since PersonalReport is a simplified domain entity, we handle the mapping
   * from Prisma's flat model + lines array.
   */
  private toDomain(
    data: {
      id: string;
      periodId: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    lines: Array<{
      id: string;
      personalReportId: string;
      youtrackIssueId: string;
      issueNumber?: string;
      summary?: string;
      minutes: number;
      baseAmount: number;
      managerPercent: number | null;
      managerAmount: number;
      businessPercent: number | null;
      businessAmount: number;
      totalOnHand: number;
      ndfl: number;
      insurance: number;
      reserveVacation: number;
      totalWithTax: number;
      effectiveRate: number;
      createdAt: Date;
    }> = [],
  ): PersonalReport {
    // If we have lines, map the first one (single line per report in our simplified model)
    if (lines.length > 0) {
      const line = lines[0];
      return PersonalReport.fromPersistence({
        id: data.id,
        periodId: data.periodId,
        userId: data.userId,
        youtrackIssueId: line.youtrackIssueId,
        issueNumber: line.issueNumber ?? '',
        summary: line.summary ?? '',
        stateName: null,
        parentIssueNumber: null,
        parentIssueId: null,
        estimationMinutes: null,
        actualMinutes: line.minutes,
        isPlanned: true,
        readinessPercent: null,
        plannedDevMinutes: null,
        plannedTestMinutes: null,
        plannedMgmtMinutes: null,
        actualDevMinutes: line.minutes,
        actualTestMinutes: null,
        actualMgmtMinutes: null,
        remainingMinutes: null,
        baseAmount: line.baseAmount,
        managerEvaluationType: null,
        managerPercent: line.managerPercent,
        managerAmount: line.managerAmount,
        businessEvaluationType: null,
        businessPercent: line.businessPercent,
        businessAmount: line.businessAmount,
        totalOnHand: line.totalOnHand,
        ndfl: line.ndfl,
        insurance: line.insurance,
        reserveVacation: line.reserveVacation,
        totalWithTax: line.totalWithTax,
        effectiveRate: line.effectiveRate,
        sortOrder: 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    // Fallback: return empty report
    return PersonalReport.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      userId: data.userId,
      youtrackIssueId: '',
      issueNumber: '',
      summary: '',
      stateName: null,
      parentIssueNumber: null,
      parentIssueId: null,
      estimationMinutes: null,
      actualMinutes: 0,
      isPlanned: false,
      readinessPercent: null,
      plannedDevMinutes: null,
      plannedTestMinutes: null,
      plannedMgmtMinutes: null,
      actualDevMinutes: null,
      actualTestMinutes: null,
      actualMgmtMinutes: null,
      remainingMinutes: null,
      baseAmount: 0,
      managerEvaluationType: null,
      managerPercent: null,
      managerAmount: 0,
      businessEvaluationType: null,
      businessPercent: null,
      businessAmount: 0,
      totalOnHand: 0,
      ndfl: 0,
      insurance: 0,
      reserveVacation: 0,
      totalWithTax: 0,
      effectiveRate: null,
      sortOrder: 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
