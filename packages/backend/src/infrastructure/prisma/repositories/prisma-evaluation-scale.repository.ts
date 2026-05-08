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
      orderBy: [{ scaleType: 'asc' }, { sortOrder: 'asc' }],
    });
    return records.map(EvaluationScale.fromPersistence);
  }

  async save(entity: EvaluationScale): Promise<EvaluationScale> {
    const p = entity.toPersistence();
    const data = await this.prisma.evaluationScale.create({
      data: {
        id: p.id as string,
        scaleType: p.scaleType as string,
        name: p.name as string,
        percent: p.percent as number,
        isDefault: p.isDefault as boolean,
        sortOrder: p.sortOrder as number,
        createdAt: p.createdAt as Date,
        updatedAt: p.updatedAt as Date,
      },
    });
    return EvaluationScale.fromPersistence(data);
  }

  async update(entity: EvaluationScale): Promise<EvaluationScale> {
    const p = entity.toPersistence();
    const data = await this.prisma.evaluationScale.update({
      where: { id: entity.id },
      data: {
        scaleType: p.scaleType as string,
        name: p.name as string,
        percent: p.percent as number,
        isDefault: p.isDefault as boolean,
        sortOrder: p.sortOrder as number,
        updatedAt: p.updatedAt as Date,
      },
    });
    return EvaluationScale.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.evaluationScale.delete({ where: { id } });
  }

  async findByScaleType(scaleType: string): Promise<EvaluationScale[]> {
    const records = await this.prisma.evaluationScale.findMany({
      where: { scaleType: scaleType },
      orderBy: { sortOrder: 'asc' },
    });
    return records.map(EvaluationScale.fromPersistence);
  }

  async findDefaultByType(scaleType: string): Promise<EvaluationScale | null> {
    const data = await this.prisma.evaluationScale.findFirst({
      where: {
        scaleType: scaleType,
        isDefault: true,
      },
    });
    return data ? EvaluationScale.fromPersistence(data) : null;
  }
}
