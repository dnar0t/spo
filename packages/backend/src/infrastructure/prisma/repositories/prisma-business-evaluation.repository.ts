/**
 * PrismaBusinessEvaluationRepository
 *
 * Prisma-реализация репозитория BusinessEvaluationRepository.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BusinessEvaluationRepository } from '../../../domain/repositories/business-evaluation.repository';
import { BusinessEvaluation } from '../../../domain/entities/business-evaluation.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaBusinessEvaluationRepository implements BusinessEvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BusinessEvaluation | null> {
    const data = await this.prisma.businessEvaluation.findUnique({
      where: { id },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByPeriodAndIssue(
    periodId: string,
    youtrackIssueId: string,
  ): Promise<BusinessEvaluation | null> {
    const data = await this.prisma.businessEvaluation.findFirst({
      where: { periodId, youtrackIssueId },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByPeriod(periodId: string): Promise<BusinessEvaluation[]> {
    const records = await this.prisma.businessEvaluation.findMany({
      where: { periodId },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByEvaluationKey(evaluationKey: string): Promise<BusinessEvaluation | null> {
    const data = await this.prisma.businessEvaluation.findFirst({
      where: { evaluationKey },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async save(entity: BusinessEvaluation): Promise<BusinessEvaluation> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.businessEvaluation.create({
      data: {
        id: persistence.id as string,
        periodId: persistence.period_id as string,
        youtrackIssueId: persistence.youtrack_issue_id as string,
        evaluatedById: persistence.evaluated_by_id as string,
        evaluationType: persistence.evaluation_type as string,
        comment: persistence.comment as string | null,
        createdAt: persistence.created_at as Date,
        updatedAt: persistence.updated_at as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: BusinessEvaluation): Promise<BusinessEvaluation> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.businessEvaluation.update({
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
      await this.prisma.businessEvaluation.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('BusinessEvaluation', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    youtrackIssueId: string;
    evaluatedById: string;
    evaluationType: string;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BusinessEvaluation {
    return BusinessEvaluation.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      youtrackIssueId: data.youtrackIssueId,
      evaluatedById: data.evaluatedById,
      evaluationType: data.evaluationType,
      percent: null,
      comment: data.comment,
      evaluationKey: `${data.periodId}_${data.youtrackIssueId}`,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
