/**
 * PrismaEmployeeProfileRepository
 *
 * Реализация репозитория EmployeeProfile через Prisma ORM.
 * Использует EmployeeProfile.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmployeeProfileRepository } from '../../../domain/repositories/employee-profile.repository';
import { EmployeeProfile } from '../../../domain/entities/employee-profile.entity';

@Injectable()
export class PrismaEmployeeProfileRepository implements EmployeeProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EmployeeProfile | null> {
    const data = await this.prisma.employeeProfile.findUnique({ where: { id } });
    return data ? EmployeeProfile.fromPersistence(data) : null;
  }

  async findAll(): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany();
    return records.map(EmployeeProfile.fromPersistence);
  }

  async save(entity: EmployeeProfile): Promise<EmployeeProfile> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeProfile.create({
      data: {
        id: p.id as string,
        user_id: p.user_id as string,
        work_role_id: p.work_role_id as string | null,
        manager_id: p.manager_id as string | null,
        planned_hours_per_year: p.planned_hours_per_year as number | null,
        created_at: p.created_at as Date,
        updated_at: p.updated_at as Date,
      },
    });
    return EmployeeProfile.fromPersistence(data);
  }

  async update(entity: EmployeeProfile): Promise<EmployeeProfile> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeProfile.update({
      where: { id: entity.id },
      data: {
        user_id: p.user_id as string,
        work_role_id: p.work_role_id as string | null,
        manager_id: p.manager_id as string | null,
        planned_hours_per_year: p.planned_hours_per_year as number | null,
        updated_at: p.updated_at as Date,
      },
    });
    return EmployeeProfile.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employeeProfile.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<EmployeeProfile | null> {
    const data = await this.prisma.employeeProfile.findUnique({
      where: { user_id: userId },
    });
    return data ? EmployeeProfile.fromPersistence(data) : null;
  }

  async findByManagerId(managerId: string): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: { manager_id: managerId },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }

  async findByWorkRoleId(workRoleId: string): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: { work_role_id: workRoleId },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }

  async findAllActive(): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: {
        user: {
          is_active: true,
          deleted_at: null,
        },
      },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }
}
