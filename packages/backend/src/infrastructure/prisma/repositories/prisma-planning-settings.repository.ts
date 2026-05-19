/**
 * PrismaPlanningSettingsRepository
 *
 * Реализация репозитория PlanningSettings через Prisma ORM.
 * Использует PlanningSettings.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { PlanningSettings } from '../../../domain/entities/planning-settings.entity';

@Injectable()
export class PrismaPlanningSettingsRepository implements PlanningSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PlanningSettings | null> {
    const data = await this.prisma.planningSettings.findUnique({ where: { id } });
    return data ? PlanningSettings.fromPersistence(data) : null;
  }

  async findAll(): Promise<PlanningSettings[]> {
    const records = await this.prisma.planningSettings.findMany();
    return records.map(PlanningSettings.fromPersistence);
  }

  async save(entity: PlanningSettings): Promise<PlanningSettings> {
    const p = entity.toPersistence();
    const data = await this.prisma.planningSettings.create({
      data: {
        id: p.id as string,
        workHoursPerMonth: p.workHoursPerMonth as number | null,
        reservePercent: p.reservePercent as number | null,
        testPercent: p.testPercent as number | null,
        debugPercent: p.debugPercent as number | null,
        mgmtPercent: p.mgmtPercent as number | null,
        yellowThreshold: p.yellowThreshold as number | null,
        redThreshold: p.redThreshold as number | null,
        businessGroupingLevel: p.businessGroupingLevel as string | null,
        extensions: p.extensions as Record<string, unknown> | null,
        updatedBy: p.updatedBy as string,
        createdAt: p.createdAt as Date,
        updatedAt: p.updatedAt as Date,
      },
    });
    return PlanningSettings.fromPersistence(data);
  }

  async update(entity: PlanningSettings): Promise<PlanningSettings> {
    const p = entity.toPersistence();
    const data = await this.prisma.planningSettings.update({
      where: { id: entity.id },
      data: {
        workHoursPerMonth: p.workHoursPerMonth as number | null,
        reservePercent: p.reservePercent as number | null,
        testPercent: p.testPercent as number | null,
        debugPercent: p.debugPercent as number | null,
        mgmtPercent: p.mgmtPercent as number | null,
        yellowThreshold: p.yellowThreshold as number | null,
        redThreshold: p.redThreshold as number | null,
        businessGroupingLevel: p.businessGroupingLevel as string | null,
        extensions: p.extensions as Record<string, unknown> | null,
        updatedBy: p.updatedBy as string,
        updatedAt: p.updatedAt as Date,
      },
    });
    return PlanningSettings.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.planningSettings.delete({ where: { id } });
  }

  async findLatest(): Promise<PlanningSettings | null> {
    const data = await this.prisma.planningSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return data ? PlanningSettings.fromPersistence(data) : null;
  }
}
