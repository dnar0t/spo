/**
 * PrismaTimesheetRepository
 *
 * Prisma-реализация репозитория ITimesheetRepository.
 * Использует PrismaService для доступа к БД и сущностям Timesheet.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { Timesheet } from '../../../domain/entities/timesheet.entity';
import { TimesheetRow } from '../../../domain/entities/timesheet-row.entity';
import { TimesheetStatusTransition } from '../../../domain/entities/timesheet-status-transition.entity';
import { TimesheetRowChange } from '../../../domain/entities/timesheet-row-change.entity';

@Injectable()
export class PrismaTimesheetRepository implements ITimesheetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Timesheet | null> {
    const record = await this.prisma.timesheet.findUnique({
      where: { id },
      include: {
        rows: true,
        history: true,
        changes: true,
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByEmployeeAndPeriod(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<Timesheet | null> {
    const record = await this.prisma.timesheet.findUnique({
      where: {
        employeeId_year_month: { employeeId, year, month },
      },
      include: {
        rows: true,
        history: true,
        changes: true,
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByPeriod(
    employeeIds: string[],
    year: number,
    month: number,
  ): Promise<Timesheet[]> {
    const records = await this.prisma.timesheet.findMany({
      where: {
        employeeId: { in: employeeIds },
        year,
        month,
      },
      include: {
        rows: true,
        history: true,
        changes: true,
      },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(timesheet: Timesheet): Promise<void> {
    const data = timesheet.toPersistence();

    await this.prisma.$transaction(async (tx) => {
      // Upsert the timesheet itself
      await tx.timesheet.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          employeeId: data.employeeId,
          year: data.year,
          month: data.month,
          status: data.status,
        },
        update: {
          status: data.status,
        },
      });

      // Delete all related child rows to recreate them
      await tx.timesheetRow.deleteMany({ where: { timesheetId: data.id } });
      await tx.timesheetStatusTransition.deleteMany({
        where: { timesheetId: data.id },
      });
      await tx.timesheetRowChange.deleteMany({
        where: { timesheetId: data.id },
      });

      // Recreate rows
      for (const row of data.rows) {
        await tx.timesheetRow.create({
          data: {
            id: row.id as string,
            timesheetId: data.id,
            issueIdReadable: row.issueIdReadable,
            source: row.source,
            minutes: row.minutes,
            comment: row.comment ?? null,
            managerGrade: row.managerGrade ?? 'none',
            businessGrade: row.businessGrade ?? 'none',
          },
        });
      }

      // Recreate status transitions
      for (const transition of data.history) {
        await tx.timesheetStatusTransition.create({
          data: {
            id: transition.id,
            timesheetId: data.id,
            actorId: transition.actorId,
            fromStatus: transition.fromStatus,
            toStatus: transition.toStatus,
            comment: transition.comment ?? null,
            createdAt: transition.createdAt,
          },
        });
      }

      // Recreate row changes
      for (const change of data.rowChanges) {
        await tx.timesheetRowChange.create({
          data: {
            id: change.id,
            timesheetId: data.id,
            rowId: change.rowId,
            actorId: change.actorId,
            field: change.field,
            fromValue: change.fromValue,
            toValue: change.toValue,
            createdAt: change.createdAt,
          },
        });
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.timesheetRow.deleteMany({ where: { timesheetId: id } });
      await tx.timesheetStatusTransition.deleteMany({
        where: { timesheetId: id },
      });
      await tx.timesheetRowChange.deleteMany({
        where: { timesheetId: id },
      });
      await tx.timesheet.delete({ where: { id } });
    });
  }

  /**
   * Maps Prisma DB record to the Timesheet domain entity.
   * Uses the entity's static factory method fromPersistence for consistency.
   */
  private toDomain(record: {
    id: string;
    employeeId: string;
    year: number;
    month: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    rows?: Array<{
      id: string;
      timesheetId: string;
      issueIdReadable: string;
      source: string;
      minutes: number;
      comment: string | null;
      managerGrade: string;
      businessGrade: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    history?: Array<{
      id: string;
      timesheetId: string;
      actorId: string;
      fromStatus: string | null;
      toStatus: string;
      comment: string | null;
      createdAt: Date;
    }>;
    changes?: Array<{
      id: string;
      timesheetId: string;
      rowId: string;
      actorId: string;
      field: string;
      fromValue: string;
      toValue: string;
      createdAt: Date;
    }>;
  }): Timesheet {
    return Timesheet.fromPersistence({
      id: record.id,
      employeeId: record.employeeId,
      year: record.year,
      month: record.month,
      status: record.status as Timesheet['status'],
      rows: (record.rows ?? []).map((row) => ({
        id: row.id,
        issueIdReadable: row.issueIdReadable,
        source: row.source as 'plan' | 'worklog',
        minutes: row.minutes,
        comment: row.comment,
        managerGrade: row.managerGrade as 'none' | 'satisfactory' | 'good' | 'excellent',
        businessGrade: row.businessGrade as 'none' | 'no_benefit' | 'direct' | 'obvious',
      })),
      history: (record.history ?? []).map((h) => ({
        id: h.id,
        actorId: h.actorId,
        fromStatus: h.fromStatus ?? '',
        toStatus: h.toStatus,
        comment: h.comment,
        createdAt: h.createdAt,
      })),
      rowChanges: (record.changes ?? []).map((c) => ({
        id: c.id,
        rowId: c.rowId,
        actorId: c.actorId,
        field: c.field as 'minutes' | 'managerGrade' | 'businessGrade',
        fromValue: c.fromValue,
        toValue: c.toValue,
        createdAt: c.createdAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
