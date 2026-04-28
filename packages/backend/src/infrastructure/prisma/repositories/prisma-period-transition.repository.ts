import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaPeriodTransitionRepository implements PeriodTransitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PeriodTransition | null> {
    const data = await this.prisma.periodTransition.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<PeriodTransition[]> {
    const records = await this.prisma.periodTransition.findMany();
    return records.map(this.toDomain);
  }

  async findByPeriodId(periodId: string): Promise<PeriodTransition[]> {
    const records = await this.prisma.periodTransition.findMany({
      where: { periodId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(this.toDomain);
  }

  async findLatestByPeriodId(periodId: string): Promise<PeriodTransition | null> {
    const data = await this.prisma.periodTransition.findFirst({
      where: { periodId },
      orderBy: { createdAt: 'desc' },
    });
    return data ? this.toDomain(data) : null;
  }

  async save(entity: PeriodTransition): Promise<PeriodTransition> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.periodTransition.create({
      data: {
        id: persistence.id as string,
        periodId: persistence.period_id as string,
        fromState: persistence.from_state as string,
        toState: persistence.to_state as string,
        userId: persistence.transitioned_by_user_id as string,
        reason: persistence.reason as string | null,
        createdAt: persistence.transitioned_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: PeriodTransition): Promise<PeriodTransition> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.periodTransition.update({
      where: { id: entity.id },
      data: {
        fromState: persistence.from_state as string,
        toState: persistence.to_state as string,
        userId: persistence.transitioned_by_user_id as string,
        reason: persistence.reason as string | null,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.periodTransition.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('PeriodTransition', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    fromState: string;
    toState: string;
    userId: string;
    reason: string | null;
    createdAt: Date;
  }): PeriodTransition {
    return PeriodTransition.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      fromState: data.fromState,
      toState: data.toState,
      transitionedByUserId: data.userId,
      reason: data.reason,
      transitionedAt: data.createdAt,
    });
  }
}
