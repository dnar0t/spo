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
        work_hours_per_month: p.work_hours_per_month as number | null,
        reserve_percent: p.reserve_percent as number | null,
        test_percent: p.test_percent as number | null,
        debug_percent: p.debug_percent as number | null,
        mgmt_percent: p.mgmt_percent as number | null,
        yellow_threshold: p.yellow_threshold as number | null,
        red_threshold: p.red_threshold as number | null,
        business_grouping_level: p.business_grouping_level as string | null,
        updated_by: p.updated_by as string,
        created_at: p.created_at as Date,
        updated_at: p.updated_at as Date,
      },
    });
    return PlanningSettings.fromPersistence(data);
  }

  async update(entity: PlanningSettings): Promise<PlanningSettings> {
    const p = entity.toPersistence();
    const data = await this.prisma.planningSettings.update({
      where: { id: entity.id },
      data: {
        work_hours_per_month: p.work_hours_per_month as number | null,
        reserve_percent: p.reserve_percent as number | null,
        test_percent: p.test_percent as number | null,
        debug_percent: p.debug_percent as number | null,
        mgmt_percent: p.mgmt_percent as number | null,
        yellow_threshold: p.yellow_threshold as number | null,
        red_threshold: p.red_threshold as number | null,
        business_grouping_level: p.business_grouping_level as string | null,
        updated_by: p.updated_by as string,
        updated_at: p.updated_at as Date,
      },
    });
    return PlanningSettings.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.planningSettings.delete({ where: { id } });
  }

  async findLatest(): Promise<PlanningSettings | null> {
    const data = await this.prisma.planningSettings.findFirst({
      orderBy: { created_at: 'desc' },
    });
    return data ? PlanningSettings.fromPersistence(data) : null;
  }
}
