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
      orderBy: [{ formula_type: 'asc' }, { name: 'asc' }],
    });
    return records.map(FormulaConfig.fromPersistence);
  }

  async save(entity: FormulaConfig): Promise<FormulaConfig> {
    const p = entity.toPersistence();
    const data = await this.prisma.formulaConfiguration.create({
      data: {
        id: p.id as string,
        name: p.name as string,
        formula_type: p.formula_type as string,
        value: p.value as number,
        is_active: p.is_active as boolean,
        description: (p.description as string | null) ?? null,
        created_by_id: 'system', // будет заменено на реального пользователя
        created_at: p.created_at as Date,
        updated_at: p.updated_at as Date,
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
        formula_type: p.formula_type as string,
        value: p.value as number,
        is_active: p.is_active as boolean,
        description: (p.description as string | null) ?? null,
        updated_at: p.updated_at as Date,
      },
    });
    return FormulaConfig.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.formulaConfiguration.delete({ where: { id } });
  }

  async findByType(formulaType: string): Promise<FormulaConfig[]> {
    const records = await this.prisma.formulaConfiguration.findMany({
      where: { formula_type: formulaType },
      orderBy: { name: 'asc' },
    });
    return records.map(FormulaConfig.fromPersistence);
  }

  async findActiveByType(formulaType: string): Promise<FormulaConfig | null> {
    const data = await this.prisma.formulaConfiguration.findFirst({
      where: {
        formula_type: formulaType,
        is_active: true,
      },
    });
    return data ? FormulaConfig.fromPersistence(data) : null;
  }

  async findActiveAll(): Promise<FormulaConfig[]> {
    const records = await this.prisma.formulaConfiguration.findMany({
      where: { is_active: true },
      orderBy: [{ formula_type: 'asc' }, { name: 'asc' }],
    });
    return records.map(FormulaConfig.fromPersistence);
  }
}
