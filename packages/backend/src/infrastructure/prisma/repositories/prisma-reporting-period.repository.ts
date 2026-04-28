import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { ReportingPeriod } from '../../../domain/entities/reporting-period.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaReportingPeriodRepository implements ReportingPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ReportingPeriod | null> {
    const data = await this.prisma.reportingPeriod.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<ReportingPeriod[]> {
    const records = await this.prisma.reportingPeriod.findMany();
    return records.map(this.toDomain);
  }

  async findByMonthYear(month: number, year: number): Promise<ReportingPeriod | null> {
    const data = await this.prisma.reportingPeriod.findFirst({
      where: { month, year },
    });
    return data ? this.toDomain(data) : null;
  }

  async findAllByYear(year: number): Promise<ReportingPeriod[]> {
    const records = await this.prisma.reportingPeriod.findMany({
      where: { year },
    });
    return records.map(this.toDomain);
  }

  async findAllOrderedByDate(): Promise<ReportingPeriod[]> {
    const records = await this.prisma.reportingPeriod.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async findLatest(): Promise<ReportingPeriod | null> {
    const data = await this.prisma.reportingPeriod.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return data ? this.toDomain(data) : null;
  }

  async save(entity: ReportingPeriod): Promise<ReportingPeriod> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.reportingPeriod.create({
      data: {
        id: persistence.id as string,
        month: persistence.month as number,
        year: persistence.year as number,
        state: persistence.state as string,
        workHoursPerMonth: persistence.work_hours_per_month as number | null,
        reservePercent: persistence.reserve_percent as number | null,
        testPercent: persistence.test_percent as number | null,
        debugPercent: persistence.debug_percent as number | null,
        mgmtPercent: persistence.mgmt_percent as number | null,
        yellowThreshold: persistence.yellow_threshold as number | null,
        redThreshold: persistence.red_threshold as number | null,
        businessGroupingLevel: persistence.business_grouping_level as string | null,
        closedAt: persistence.closed_at as Date | null,
        reopenedAt: persistence.reopened_at as Date | null,
        reopenReason: persistence.reopen_reason as string | null,
        createdById: persistence.created_by_id as string,
        createdAt: persistence.created_at as Date,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: ReportingPeriod): Promise<ReportingPeriod> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.reportingPeriod.update({
      where: { id: entity.id },
      data: {
        month: persistence.month as number,
        year: persistence.year as number,
        state: persistence.state as string,
        workHoursPerMonth: persistence.work_hours_per_month as number | null,
        reservePercent: persistence.reserve_percent as number | null,
        testPercent: persistence.test_percent as number | null,
        debugPercent: persistence.debug_percent as number | null,
        mgmtPercent: persistence.mgmt_percent as number | null,
        yellowThreshold: persistence.yellow_threshold as number | null,
        redThreshold: persistence.red_threshold as number | null,
        businessGroupingLevel: persistence.business_grouping_level as string | null,
        closedAt: persistence.closed_at as Date | null,
        reopenedAt: persistence.reopened_at as Date | null,
        reopenReason: persistence.reopen_reason as string | null,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.reportingPeriod.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('ReportingPeriod', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   * Prisma uses camelCase fields; the domain entity's fromPersistence
   * expects camelCase as well, so we map directly.
   */
  private toDomain(data: {
    id: string;
    month: number;
    year: number;
    state: string;
    workHoursPerMonth: number | null;
    reservePercent: number | null;
    testPercent: number | null;
    debugPercent: number | null;
    mgmtPercent: number | null;
    yellowThreshold: number | null;
    redThreshold: number | null;
    businessGroupingLevel: string | null;
    closedAt: Date | null;
    reopenedAt: Date | null;
    reopenReason: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): ReportingPeriod {
    return ReportingPeriod.fromPersistence({
      id: data.id,
      month: data.month,
      year: data.year,
      state: data.state,
      workHoursPerMonth: data.workHoursPerMonth,
      reservePercent: data.reservePercent,
      testPercent: data.testPercent,
      debugPercent: data.debugPercent,
      mgmtPercent: data.mgmtPercent,
      yellowThreshold: data.yellowThreshold,
      redThreshold: data.redThreshold,
      businessGroupingLevel: data.businessGroupingLevel,
      employeeFilter: null,
      projectFilter: null,
      priorityFilter: null,
      createdById: data.createdById,
      closedAt: data.closedAt,
      reopenedAt: data.reopenedAt,
      reopenReason: data.reopenReason,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
