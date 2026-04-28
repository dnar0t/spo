/**
 * PrismaWorkRoleRepository
 *
 * Реализация репозитория WorkRole через Prisma ORM.
 * Использует WorkRole.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkRoleRepository } from '../../../domain/repositories/work-role.repository';
import { WorkRole } from '../../../domain/entities/work-role.entity';

@Injectable()
export class PrismaWorkRoleRepository implements WorkRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WorkRole | null> {
    const data = await this.prisma.workRole.findUnique({ where: { id } });
    return data ? WorkRole.fromPersistence(data) : null;
  }

  async findAll(): Promise<WorkRole[]> {
    const records = await this.prisma.workRole.findMany({
      orderBy: { name: 'asc' },
    });
    return records.map(WorkRole.fromPersistence);
  }

  async save(entity: WorkRole): Promise<WorkRole> {
    const p = entity.toPersistence();
    const data = await this.prisma.workRole.create({
      data: {
        id: p.id as string,
        name: p.name as string,
        description: p.description as string | null,
        created_at: p.created_at as Date,
        updated_at: p.updated_at as Date,
      },
    });
    return WorkRole.fromPersistence(data);
  }

  async update(entity: WorkRole): Promise<WorkRole> {
    const p = entity.toPersistence();
    const data = await this.prisma.workRole.update({
      where: { id: entity.id },
      data: {
        name: p.name as string,
        description: p.description as string | null,
        updated_at: p.updated_at as Date,
      },
    });
    return WorkRole.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workRole.delete({ where: { id } });
  }

  async findByName(name: string): Promise<WorkRole | null> {
    const data = await this.prisma.workRole.findUnique({ where: { name } });
    return data ? WorkRole.fromPersistence(data) : null;
  }
}
