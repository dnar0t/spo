import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LoginAttemptRepository } from '../../../domain/repositories/login-attempt.repository';
import { LoginAttempt } from '../../../domain/entities/login-attempt.entity';

@Injectable()
export class PrismaLoginAttemptRepository implements LoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LoginAttempt | null> {
    const data = await this.prisma.loginAttempt.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<LoginAttempt[]> {
    const records = await this.prisma.loginAttempt.findMany();
    return records.map(this.toDomain);
  }

  async findRecentByLogin(login: string, withinMinutes: number): Promise<LoginAttempt[]> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    const records = await this.prisma.loginAttempt.findMany({
      where: {
        login,
        attemptedAt: { gte: since },
      },
      orderBy: { attemptedAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async findRecentByIp(ip: string, withinMinutes: number): Promise<LoginAttempt[]> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    const records = await this.prisma.loginAttempt.findMany({
      where: {
        ipAddress: ip,
        attemptedAt: { gte: since },
      },
      orderBy: { attemptedAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async countRecentFailedByLogin(login: string, withinMinutes: number): Promise<number> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.prisma.loginAttempt.count({
      where: {
        login,
        isSuccess: false,
        attemptedAt: { gte: since },
      },
    });
  }

  async countRecentFailedByIp(ip: string, withinMinutes: number): Promise<number> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    return this.prisma.loginAttempt.count({
      where: {
        ipAddress: ip,
        isSuccess: false,
        attemptedAt: { gte: since },
      },
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.loginAttempt.deleteMany({
      where: {
        attemptedAt: { lt: date },
      },
    });
    return result.count;
  }

  async save(entity: LoginAttempt): Promise<LoginAttempt> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.loginAttempt.create({
      data: {
        id: persistence.id as string,
        login: persistence.login as string,
        ipAddress: persistence.ip_address as string,
        isSuccess: persistence.is_success as boolean,
        attemptedAt: persistence.attempted_at as Date,
        blockedUntil: persistence.blocked_until as Date | null,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: LoginAttempt): Promise<LoginAttempt> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.loginAttempt.update({
      where: { id: entity.id },
      data: {
        blockedUntil: persistence.blocked_until as Date | null,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.loginAttempt.delete({ where: { id } });
  }

  private toDomain(data: any): LoginAttempt {
    return LoginAttempt.fromPersistence({
      id: data.id,
      login: data.login,
      ipAddress: data.ipAddress,
      isSuccess: data.isSuccess,
      attemptedAt: data.attemptedAt,
      blockedUntil: data.blockedUntil,
    });
  }
}
