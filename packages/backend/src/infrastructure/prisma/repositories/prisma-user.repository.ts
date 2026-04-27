import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({ where: { id } });
    return data ? User.fromPersistence(data) : null;
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany();
    return records.map(User.fromPersistence);
  }

  async save(entity: User): Promise<User> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.user.create({
      data: {
        id: persistence.id as string,
        login: persistence.login as string,
        email: persistence.email as string | null,
        full_name: persistence.full_name as string | null,
        youtrack_login: persistence.youtrack_login as string | null,
        youtrack_user_id: persistence.youtrack_user_id as string | null,
        ad_login: persistence.ad_login as string | null,
        is_active: persistence.is_active as boolean,
        is_blocked: persistence.is_blocked as boolean,
        employment_date: persistence.employment_date as Date | null,
        termination_date: persistence.termination_date as Date | null,
        created_at: persistence.created_at as Date,
        updated_at: persistence.updated_at as Date,
        deleted_at: persistence.deleted_at as Date | null,
        extensions: persistence.extensions as Record<string, unknown> | null,
      },
    });
    return User.fromPersistence(data);
  }

  async update(entity: User): Promise<User> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.user.update({
      where: { id: entity.id },
      data: {
        login: persistence.login as string,
        email: persistence.email as string | null,
        full_name: persistence.full_name as string | null,
        youtrack_login: persistence.youtrack_login as string | null,
        youtrack_user_id: persistence.youtrack_user_id as string | null,
        ad_login: persistence.ad_login as string | null,
        is_active: persistence.is_active as boolean,
        is_blocked: persistence.is_blocked as boolean,
        employment_date: persistence.employment_date as Date | null,
        termination_date: persistence.termination_date as Date | null,
        updated_at: persistence.updated_at as Date,
        deleted_at: persistence.deleted_at as Date | null,
        extensions: persistence.extensions as Record<string, unknown> | null,
      },
    });
    return User.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });
  }

  async findByLogin(login: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({ where: { login } });
    return data ? User.fromPersistence(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({ where: { email } });
    return data ? User.fromPersistence(data) : null;
  }

  async findByYouTrackUserId(youtrackUserId: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: { youtrack_user_id: youtrackUserId },
    });
    return data ? User.fromPersistence(data) : null;
  }

  async findByAdLogin(adLogin: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: { ad_login: adLogin },
    });
    return data ? User.fromPersistence(data) : null;
  }

  async findAllActive(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { is_active: true, deleted_at: null },
    });
    return records.map(User.fromPersistence);
  }

  async findByRole(roleName: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        roles: {
          some: {
            role: { name: roleName },
          },
        },
      },
    });
    return records.map(User.fromPersistence);
  }

  async findSubordinatesByManagerId(managerId: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        employeeProfile: {
          manager_id: managerId,
        },
      },
    });
    return records.map(User.fromPersistence);
  }
}
