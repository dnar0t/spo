/**
 * PrismaPeriodSnapshotRepository
 *
 * Prisma-реализация репозитория PeriodSnapshotRepository.
 * Использует PeriodSnapshot.entity для преобразования данных.
 * Поля JSONB (employeeRates, formulas и т.д.) передаются напрямую как объекты,
 * Prisma автоматически сериализует/десериализует их.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PeriodSnapshotRepository } from '../../../domain/repositories/period-snapshot.repository';
import { PeriodSnapshot } from '../../../domain/entities/period-snapshot.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaPeriodSnapshotRepository implements PeriodSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PeriodSnapshot | null> {
    const data = await this.prisma.periodSnapshot.findUnique({ where: { id } });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findAll(): Promise<PeriodSnapshot[]> {
    const records = await this.prisma.periodSnapshot.findMany();
    return records.map(this.toDomain);
  }

  async findByPeriodId(periodId: string): Promise<PeriodSnapshot | null> {
    const data = await this.prisma.periodSnapshot.findUnique({
      where: { periodId },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async save(entity: PeriodSnapshot): Promise<PeriodSnapshot> {
    const p = entity.toPersistence();
    const data = await this.prisma.periodSnapshot.create({
      data: {
        id: p.id,
        periodId: p.periodId,
        employeeRates: p.employeeRates,
        formulas: p.formulas,
        evaluationScales: p.evaluationScales,
        workItems: p.workItems,
        issues: p.issues,
        issueHierarchy: p.issueHierarchy,
        reportLines: p.reportLines,
        aggregates: p.aggregates,
        createdAt: p.createdAt,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: PeriodSnapshot): Promise<PeriodSnapshot> {
    const p = entity.toPersistence();
    const data = await this.prisma.periodSnapshot.update({
      where: { id: entity.id },
      data: {
        periodId: p.periodId,
        employeeRates: p.employeeRates,
        formulas: p.formulas,
        evaluationScales: p.evaluationScales,
        workItems: p.workItems,
        issues: p.issues,
        issueHierarchy: p.issueHierarchy,
        reportLines: p.reportLines,
        aggregates: p.aggregates,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.periodSnapshot.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('PeriodSnapshot', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   * JSONB поля приходят из Prisma как объекты, передаём их напрямую.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    employeeRates: unknown;
    formulas: unknown;
    evaluationScales: unknown;
    workItems: unknown;
    issues: unknown;
    issueHierarchy: unknown;
    reportLines: unknown;
    aggregates: unknown;
    createdAt: Date;
  }): PeriodSnapshot {
    return PeriodSnapshot.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      employeeRates: (data.employeeRates ?? {}) as Record<string, unknown>,
      formulas: (data.formulas ?? {}) as Record<string, unknown>,
      evaluationScales: (data.evaluationScales ?? {}) as Record<string, unknown>,
      workItems: (data.workItems ?? {}) as Record<string, unknown>,
      issues: (data.issues ?? {}) as Record<string, unknown>,
      issueHierarchy: (data.issueHierarchy ?? {}) as Record<string, unknown>,
      reportLines: (data.reportLines ?? {}) as Record<string, unknown>,
      aggregates: (data.aggregates ?? {}) as Record<string, unknown>,
      createdAt: data.createdAt,
    });
  }
}
