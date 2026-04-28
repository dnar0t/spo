import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SprintPlanRepository } from '../../../domain/repositories/sprint-plan.repository';
import { SprintPlan } from '../../../domain/entities/sprint-plan.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaSprintPlanRepository implements SprintPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SprintPlan | null> {
    const data = await this.prisma.sprintPlan.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<SprintPlan[]> {
    const records = await this.prisma.sprintPlan.findMany();
    return records.map(this.toDomain);
  }

  async findByPeriodId(periodId: string): Promise<SprintPlan | null> {
    const data = await this.prisma.sprintPlan.findFirst({
      where: { periodId },
      orderBy: { versionNumber: 'desc' },
    });
    return data ? this.toDomain(data) : null;
  }

  async findVersionsByPeriodId(periodId: string): Promise<SprintPlan[]> {
    const records = await this.prisma.sprintPlan.findMany({
      where: { periodId },
      orderBy: { versionNumber: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async findLatestVersion(periodId: string): Promise<number> {
    const result = await this.prisma.sprintPlan.aggregate({
      where: { periodId },
      _max: { versionNumber: true },
    });
    return result._max.versionNumber ?? 0;
  }

  async save(entity: SprintPlan): Promise<SprintPlan> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.sprintPlan.create({
      data: {
        id: persistence.id as string,
        periodId: persistence.period_id as string,
        versionNumber: persistence.version_number as number,
        isFixed: persistence.is_fixed as boolean,
        fixedAt: persistence.fixed_at as Date | null,
        fixedBy: persistence.fixed_by_user_id as string | null,
        createdAt: persistence.created_at as Date,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: SprintPlan): Promise<SprintPlan> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.sprintPlan.update({
      where: { id: entity.id },
      data: {
        versionNumber: persistence.version_number as number,
        isFixed: persistence.is_fixed as boolean,
        fixedAt: persistence.fixed_at as Date | null,
        fixedBy: persistence.fixed_by_user_id as string | null,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.sprintPlan.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('SprintPlan', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    versionNumber: number;
    isFixed: boolean;
    fixedAt: Date | null;
    fixedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SprintPlan {
    return SprintPlan.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      versionNumber: data.versionNumber,
      isFixed: data.isFixed,
      fixedAt: data.fixedAt,
      fixedByUserId: data.fixedBy,
      fixedPlanHistory: null,
      totalPlannedMinutes: 0,
      taskCount: 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
