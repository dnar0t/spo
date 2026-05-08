/**
 * PrismaFormulaConfigRepository
 *
 * Реализация репозитория FormulaConfig через Prisma ORM.
 * Использует FormulaConfig.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { FormulaConfig } from '../../../domain/entities/formula-config.entity';

@Injectable()
export class PrismaFormulaConfigRepository implements FormulaConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FormulaConfig | null> {
    const data = await this.prisma.formulaConfiguration.findUnique({ where: { id } });
    return data ? FormulaConfig.fromPersistence(data) : null;
  }

  async findAll(): Promise<FormulaConfig[]> {
    const records = await this.prisma.formulaConfiguration.findMany({
      orderBy: [{ formulaType: 'asc' }, { name: 'asc' }],
    });
    return records.map(FormulaConfig.fromPersistence);
  }

  async save(entity: FormulaConfig): Promise<FormulaConfig> {
    const p = entity.toPersistence();
    const data = await this.prisma.formulaConfiguration.create({
      data: {
        id: p.id as string,
        name: p.name as string,
        formulaType: p.formulaType as string,
        value: p.value as number,
        isActive: p.isActive as boolean,
        description: (p.description as string | null) ?? null,
        createdById: 'system', // будет заменено на реального пользователя
        createdAt: p.createdAt as Date,
        updatedAt: p.updatedAt as Date,
      },
    });
    return FormulaConfig.fromPersistence(data);
  }

  async update(entity: FormulaConfig): Promise<FormulaConfig> {
    const p = entity.toPersistence();
    const data = await this.prisma.formulaConfiguration.update({
      where: { id: entity.id },
      data: {
        name: p.name as string,
        formulaType: p.formulaType as string,
        value: p.value as number,
        isActive: p.isActive as boolean,
        description: (p.description as string | null) ?? null,
        updatedAt: p.updatedAt as Date,
      },
    });
    return FormulaConfig.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.formulaConfiguration.delete({ where: { id } });
  }

  async findByType(formulaType: string): Promise<FormulaConfig[]> {
    const records = await this.prisma.formulaConfiguration.findMany({
      where: { formulaType: formulaType },
      orderBy: { name: 'asc' },
    });
    return records.map(FormulaConfig.fromPersistence);
  }

  async findActiveByType(formulaType: string): Promise<FormulaConfig | null> {
    const data = await this.prisma.formulaConfiguration.findFirst({
      where: {
        formulaType: formulaType,
        isActive: true,
      },
    });
    return data ? FormulaConfig.fromPersistence(data) : null;
  }

  async findActiveAll(): Promise<FormulaConfig[]> {
    const records = await this.prisma.formulaConfiguration.findMany({
      where: { isActive: true },
      orderBy: [{ formulaType: 'asc' }, { name: 'asc' }],
    });
    return records.map(FormulaConfig.fromPersistence);
  }
}
