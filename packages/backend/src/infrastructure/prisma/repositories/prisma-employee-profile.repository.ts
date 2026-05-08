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
        userId: p.userId as string,
        workRoleId: p.workRoleId as string | null,
        managerId: p.managerId as string | null,
        plannedHoursPerYear: p.plannedHoursPerYear as number | null,
        createdAt: p.createdAt as Date,
        updatedAt: p.updatedAt as Date,
      },
    });
    return EmployeeProfile.fromPersistence(data);
  }

  async update(entity: EmployeeProfile): Promise<EmployeeProfile> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeProfile.update({
      where: { id: entity.id },
      data: {
        userId: p.userId as string,
        workRoleId: p.workRoleId as string | null,
        managerId: p.managerId as string | null,
        plannedHoursPerYear: p.plannedHoursPerYear as number | null,
        updatedAt: p.updatedAt as Date,
      },
    });
    return EmployeeProfile.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employeeProfile.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<EmployeeProfile | null> {
    const data = await this.prisma.employeeProfile.findUnique({
      where: { userId: userId },
    });
    return data ? EmployeeProfile.fromPersistence(data) : null;
  }

  async findByManagerId(managerId: string): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: { managerId: managerId },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }

  async findByWorkRoleId(workRoleId: string): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: { workRoleId: workRoleId },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }

  async findAllActive(): Promise<EmployeeProfile[]> {
    const records = await this.prisma.employeeProfile.findMany({
      where: {
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
    });
    return records.map(EmployeeProfile.fromPersistence);
  }
}
