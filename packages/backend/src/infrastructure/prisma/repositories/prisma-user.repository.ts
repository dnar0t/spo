import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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
    const data = await this.prisma.user.create({
      data: {
        id: entity.id,
        login: entity.login,
        email: entity.email,
        fullName: entity.fullName,
        youtrackLogin: entity.youtrackLogin,
        youtrackUserId: entity.youtrackUserId,
        adLogin: entity.adLogin,
        isActive: entity.isActive,
        isBlocked: entity.isBlocked,
        employmentDate: entity.employmentDate,
        terminationDate: entity.terminationDate,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
        extensions: entity.extensions,
      },
    });
    return User.fromPersistence(data);
  }

  async update(entity: User): Promise<User> {
    const data = await this.prisma.user.update({
      where: { id: entity.id },
      data: {
        login: entity.login,
        email: entity.email,
        fullName: entity.fullName,
        youtrackLogin: entity.youtrackLogin,
        youtrackUserId: entity.youtrackUserId,
        adLogin: entity.adLogin,
        isActive: entity.isActive,
        isBlocked: entity.isBlocked,
        employmentDate: entity.employmentDate,
        terminationDate: entity.terminationDate,
        updatedAt: entity.updatedAt,
        deletedAt: entity.deletedAt,
        extensions: entity.extensions,
      },
    });
    return User.fromPersistence(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
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
      where: { youtrackUserId: youtrackUserId },
    });
    return data ? User.fromPersistence(data) : null;
  }

  async findByAdLogin(adLogin: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: { adLogin: adLogin },
    });
    return data ? User.fromPersistence(data) : null;
  }

  async findAllActive(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
    });
    return records.map(User.fromPersistence);
  }

  async findByRole(roleName: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
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
        isActive: true,
        deletedAt: null,
        employeeProfile: {
          managerId: managerId,
        },
      },
    });
    return records.map(User.fromPersistence);
  }

  async findUserRoleNames(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.map((ur) => ur.role.name);
  }

  async syncRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          id: uuidv4(),
          userId,
          roleId,
        })),
      });
    }
  }
}
