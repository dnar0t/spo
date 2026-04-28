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
        user_id: p.user_id as string,
        monthly_salary: p.monthly_salary as number,
        annual_minutes: p.annual_minutes as number,
        hourly_rate: p.hourly_rate as number,
        effective_from: p.effective_from as Date,
        effective_to: p.effective_to as Date | null,
        changed_by_id: p.changed_by_id as string,
        change_reason: p.change_reason as string | null,
        created_at: p.created_at as Date,
      },
    });
    return EmployeeRate.fromPersistence(data);
  }

  async update(entity: EmployeeRate): Promise<EmployeeRate> {
    const p = entity.toPersistence();
    const data = await this.prisma.employeeRateHistory.update({
      where: { id: entity.id },
      data: {
        user_id: p.user_id as string,
        monthly_salary: p.monthly_salary as number,
        annual_minutes: p.annual_minutes as number,
        hourly_rate: p.hourly_rate as number,
        effective_from: p.effective_from as Date,
        effective_to: p.effective_to as Date | null,
        changed_by_id: p.changed_by_id as string,
        change_reason: p.change_reason as string | null,
      },
    });
    return EmployeeRate.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.employeeRateHistory.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<EmployeeRate[]> {
    const records = await this.prisma.employeeRateHistory.findMany({
      where: { user_id: userId },
      orderBy: { effective_from: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }

  async findEffectiveByUserId(userId: string, date: Date): Promise<EmployeeRate | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);

    const data = await this.prisma.employeeRateHistory.findFirst({
      where: {
        user_id: userId,
        effective_from: { lte: normalizedDate },
        OR: [
          { effective_to: null },
          { effective_to: { gte: normalizedDate } },
        ],
      },
      orderBy: { effective_from: 'desc' },
    });
    return data ? EmployeeRate.fromPersistence(data) : null;
  }

  async findHistoryByUserId(userId: string): Promise<EmployeeRate[]> {
    const records = await this.prisma.employeeRateHistory.findMany({
      where: { user_id: userId },
      orderBy: { effective_from: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }

  async findCurrentEffective(): Promise<EmployeeRate[]> {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const records = await this.prisma.employeeRateHistory.findMany({
      where: {
        effective_from: { lte: now },
        OR: [
          { effective_to: null },
          { effective_to: { gte: now } },
        ],
      },
      orderBy: { effective_from: 'desc' },
    });
    return records.map(EmployeeRate.fromPersistence);
  }
}
