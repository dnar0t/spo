/**
 * PrismaEmployeeRateRepository
 *
 * Реализация репозитория EmployeeRate через Prisma ORM.
 * Использует EmployeeRate.entity для преобразования данных.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { EmployeeRate } from '../../../domain/entities/employee-rate.entity';

@Injectable()
export class PrismaEmployeeRateRepository implements EmployeeRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<EmployeeRate | null> {
    const data = await this.prisma.employeeRateHistory.findUnique({ where: { id } });
    return data ? EmployeeRate.fromPersistence(data) : null;
  }

  async findAll(): Promise<EmployeeRate[]> {
    const records = await this.prisma.employeeRateHistory.findMany();
    return records.map(EmployeeRate.fromPersistence);
  }

  async save(entity: EmployeeRate): Promise<EmployeeRate> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeRateHistory.create({
      data: {
        id: p.id as string,
        userId: p.userId as string,
        monthlySalary: p.monthlySalary as number,
        annualMinutes: p.annualMinutes as number,
        hourlyRate: p.hourlyRate as number,
        effectiveFrom: p.effectiveFrom as Date,
        effectiveTo: p.effectiveTo as Date | null,
        changedById: p.changedById as string,
        changeReason: p.changeReason as string | null,
        createdAt: p.createdAt as Date,
      },
    });
    return EmployeeRate.fromPersistence(data);
  }

  async update(entity: EmployeeRate): Promise<EmployeeRate> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeRateHistory.update({
      where: { id: entity.id },
      data: {
        userId: p.userId as string,
        monthlySalary: p.monthlySalary as number,
        annualMinutes: p.annualMinutes as number,
        hourlyRate: p.hourlyRate as number,
        effectiveFrom: p.effectiveFrom as Date,
        effectiveTo: p.effectiveTo as Date | null,
        changedById: p.changedById as string,
        changeReason: p.changeReason as string | null,
      },
    });
    return EmployeeRate.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employeeRateHistory.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<EmployeeRate[]> {
    const records = await this.prisma.employeeRateHistory.findMany({
      where: { userId: userId },
      orderBy: { effectiveFrom: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }

  async findEffectiveByUserId(userId: string, date: Date): Promise<EmployeeRate | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);

    const data = await this.prisma.employeeRateHistory.findFirst({
      where: {
        userId: userId,
        effectiveFrom: { lte: normalizedDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: normalizedDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return data ? EmployeeRate.fromPersistence(data) : null;
  }

  async findHistoryByUserId(userId: string): Promise<EmployeeRate[]> {
    const records = await this.prisma.employeeRateHistory.findMany({
      where: { userId: userId },
      orderBy: { effectiveFrom: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }

  async findCurrentEffective(): Promise<EmployeeRate[]> {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const records = await this.prisma.employeeRateHistory.findMany({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }
}
