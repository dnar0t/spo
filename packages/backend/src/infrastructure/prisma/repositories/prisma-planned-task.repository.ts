import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { PlannedTask } from '../../../domain/entities/planned-task.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaPlannedTaskRepository implements PlannedTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PlannedTask | null> {
    const data = await this.prisma.plannedTask.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<PlannedTask[]> {
    const records = await this.prisma.plannedTask.findMany();
    return records.map(this.toDomain);
  }

  async findByPeriodId(periodId: string): Promise<PlannedTask[]> {
    const records = await this.prisma.plannedTask.findMany({
      where: {
        sprintPlan: { periodId },
      },
    });
    return records.map(this.toDomain);
  }

  async findByIssueNumber(issueNumber: string, periodId: string): Promise<PlannedTask | null> {
    const data = await this.prisma.plannedTask.findFirst({
      where: {
        sprintPlan: { periodId },
        youtrackIssue: { issueNumber },
      },
    });
    return data ? this.toDomain(data) : null;
  }

  async findAssignedToUser(userId: string, periodId: string): Promise<PlannedTask[]> {
    const records = await this.prisma.plannedTask.findMany({
      where: {
        assigneeId: userId,
        sprintPlan: { periodId },
      },
    });
    return records.map(this.toDomain);
  }

  async findPlannedByPeriodId(periodId: string): Promise<PlannedTask[]> {
    const all = await this.findByPeriodId(periodId);
    return all.filter((task) => task.isPlanned);
  }

  async findUnplannedByPeriodId(periodId: string): Promise<PlannedTask[]> {
    const all = await this.findByPeriodId(periodId);
    return all.filter((task) => !task.isPlanned);
  }

  async findMaxSortOrder(periodId: string): Promise<number> {
    const result = await this.prisma.plannedTask.aggregate({
      where: {
        sprintPlan: { periodId },
      },
      _max: { sortOrder: true },
    });
    return result._max.sortOrder ?? 0;
  }

  async deleteByPeriodId(periodId: string): Promise<void> {
    await this.prisma.plannedTask.deleteMany({
      where: {
        sprintPlan: { periodId },
      },
    });
  }

  async save(entity: PlannedTask): Promise<PlannedTask> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.plannedTask.create({
      data: {
        id: persistence.id as string,
        sprintPlanId: persistence.period_id as string,
        youtrackIssueId: persistence.issue_number as string,
        assigneeId: persistence.assignee_id as string | null,
        plannedMinutes: (persistence.planned_dev_minutes as number) ?? 0,
        debugMinutes: (persistence.planned_debug_minutes as number) ?? 0,
        testMinutes: (persistence.planned_test_minutes as number) ?? 0,
        mgmtMinutes: (persistence.planned_mgmt_minutes as number) ?? 0,
        sortOrder: persistence.sort_order as number,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: PlannedTask): Promise<PlannedTask> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.plannedTask.update({
      where: { id: entity.id },
      data: {
        assigneeId: persistence.assignee_id as string | null,
        plannedMinutes: (persistence.planned_dev_minutes as number) ?? 0,
        debugMinutes: (persistence.planned_debug_minutes as number) ?? 0,
        testMinutes: (persistence.planned_test_minutes as number) ?? 0,
        mgmtMinutes: (persistence.planned_mgmt_minutes as number) ?? 0,
        sortOrder: persistence.sort_order as number,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.plannedTask.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('PlannedTask', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    sprintPlanId: string;
    youtrackIssueId: string;
    assigneeId: string | null;
    plannedMinutes: number;
    debugMinutes: number;
    testMinutes: number;
    mgmtMinutes: number;
    sortOrder: number;
  }): PlannedTask {
    const totalPlanned = data.plannedMinutes + data.testMinutes + data.debugMinutes + data.mgmtMinutes;
    return PlannedTask.fromPersistence({
      id: data.id,
      periodId: data.sprintPlanId,
      issueNumber: data.youtrackIssueId,
      summary: '',
      youtrackIssueId: data.youtrackIssueId,
      assigneeId: data.assigneeId,
      estimationMinutes: null,
      plannedDevMinutes: data.plannedMinutes,
      plannedTestMinutes: data.testMinutes,
      plannedMgmtMinutes: data.mgmtMinutes,
      plannedDebugMinutes: data.debugMinutes,
      readinessPercent: totalPlanned > 0 ? 10000 : 0,
      sortOrder: data.sortOrder,
      isPlanned: totalPlanned > 0,
      parentIssueNumber: null,
      parentIssueId: null,
    });
  }
}
