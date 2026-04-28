/**
 * PrismaEvaluationScaleRepository
 *
 * Реализация репозитория EvaluationScale через Prisma ORM.
 * Использует EvaluationScale.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EvaluationScaleRepository } from '../../../domain/repositories/evaluation-scale.repository';
import { EvaluationScale } from '../../../domain/entities/evaluation-scale.entity';

@Injectable()
export class PrismaEvaluationScaleRepository implements EvaluationScaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EvaluationScale | null> {
    const data = await this.prisma.evaluationScale.findUnique({ where: { id } });
    return data ? EvaluationScale.fromPersistence(data) : null;
  }

  async findAll(): Promise<EvaluationScale[]> {
    const records = await this.prisma.evaluationScale.findMany({
      orderBy: [{ scale_type: 'asc' }, { sort_order: 'asc' }],
    });
    return records.map(EvaluationScale.fromPersistence);
  }

  async save(entity: EvaluationScale): Promise<EvaluationScale> {
    const p = entity.toPersistence();
    const data = await this.prisma.evaluationScale.create({
      data: {
        id: p.id as string,
        scale_type: p.scale_type as string,
        name: p.name as string,
        percent: p.percent as number,
        is_default: p.is_default as boolean,
        sort_order: p.sort_order as number,
        created_at: p.created_at as Date,
        updated_at: p.updated_at as Date,
      },
    });
    return EvaluationScale.fromPersistence(data);
  }

  async update(entity: EvaluationScale): Promise<EvaluationScale> {
    const p = entity.toPersistence();
    const data = await this.prisma.evaluationScale.update({
      where: { id: entity.id },
      data: {
        scale_type: p.scale_type as string,
        name: p.name as string,
        percent: p.percent as number,
        is_default: p.is_default as boolean,
        sort_order: p.sort_order as number,
        updated_at: p.updated_at as Date,
      },
    });
    return EvaluationScale.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.evaluationScale.delete({ where: { id } });
  }

  async findByScaleType(scaleType: string): Promise<EvaluationScale[]> {
    const records = await this.prisma.evaluationScale.findMany({
      where: { scale_type: scaleType },
      orderBy: { sort_order: 'asc' },
    });
    return records.map(EvaluationScale.fromPersistence);
  }

  async findDefaultByType(scaleType: string): Promise<EvaluationScale | null> {
    const data = await this.prisma.evaluationScale.findFirst({
      where: {
        scale_type: scaleType,
        is_default: true,
      },
    });
    return data ? EvaluationScale.fromPersistence(data) : null;
  }
}
