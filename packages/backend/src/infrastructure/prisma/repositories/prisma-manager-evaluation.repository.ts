/**
 * PrismaManagerEvaluationRepository
 *
 * Prisma-реализация репозитория ManagerEvaluationRepository.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ManagerEvaluationRepository } from '../../../domain/repositories/manager-evaluation.repository';
import { ManagerEvaluation } from '../../../domain/entities/manager-evaluation.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaManagerEvaluationRepository implements ManagerEvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ManagerEvaluation | null> {
    const data = await this.prisma.managerEvaluation.findUnique({
      where: { id },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByPeriodAndIssueAndUser(
    periodId: string,
    youtrackIssueId: string,
    userId: string,
  ): Promise<ManagerEvaluation | null> {
    const data = await this.prisma.managerEvaluation.findFirst({
      where: { periodId, youtrackIssueId, userId },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByPeriod(periodId: string): Promise<ManagerEvaluation[]> {
    const records = await this.prisma.managerEvaluation.findMany({
      where: { periodId },
    });
    return records.map(this.toDomain);
  }

  async findByUserAndPeriod(userId: string, periodId: string): Promise<ManagerEvaluation[]> {
    const records = await this.prisma.managerEvaluation.findMany({
      where: { userId, periodId },
    });
    return records.map(this.toDomain);
  }

  async save(entity: ManagerEvaluation): Promise<ManagerEvaluation> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.managerEvaluation.create({
      data: {
        id: persistence.id as string,
        periodId: persistence.period_id as string,
        youtrackIssueId: persistence.youtrack_issue_id as string,
        userId: persistence.user_id as string,
        evaluatedById: persistence.evaluated_by_id as string,
        evaluationType: persistence.evaluation_type as string,
        comment: persistence.comment as string | null,
        createdAt: persistence.created_at as Date,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: ManagerEvaluation): Promise<ManagerEvaluation> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.managerEvaluation.update({
      where: { id: entity.id },
      data: {
        evaluationType: persistence.evaluation_type as string,
        comment: persistence.comment as string | null,
        evaluatedById: persistence.evaluated_by_id as string,
        updatedAt: new Date(),
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.managerEvaluation.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('ManagerEvaluation', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    youtrackIssueId: string;
    userId: string;
    evaluatedById: string;
    evaluationType: string;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ManagerEvaluation {
    return ManagerEvaluation.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      youtrackIssueId: data.youtrackIssueId,
      userId: data.userId,
      evaluatedById: data.evaluatedById,
      evaluationType: data.evaluationType,
      percent: null,
      comment: data.comment,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
