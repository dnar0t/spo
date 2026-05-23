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
        fullName: persistence.fullName as string | null,
        youtrackLogin: persistence.youtrackLogin as string | null,
        youtrackUserId: persistence.youtrackUserId as string | null,
        adLogin: persistence.adLogin as string | null,
        isActive: persistence.isActive as boolean,
        isBlocked: persistence.isBlocked as boolean,
        employmentDate: persistence.employmentDate as Date | null,
        terminationDate: persistence.terminationDate as Date | null,
        createdAt: persistence.createdAt as Date,
        updatedAt: persistence.updatedAt as Date,
        deletedAt: persistence.deletedAt as Date | null,
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
        fullName: persistence.fullName as string | null,
        youtrackLogin: persistence.youtrackLogin as string | null,
        youtrackUserId: persistence.youtrackUserId as string | null,
        adLogin: persistence.adLogin as string | null,
        isActive: persistence.isActive as boolean,
        isBlocked: persistence.isBlocked as boolean,
        employmentDate: persistence.employmentDate as Date | null,
        terminationDate: persistence.terminationDate as Date | null,
        updatedAt: persistence.updatedAt as Date,
        deletedAt: persistence.deletedAt as Date | null,
        extensions: persistence.extensions as Record<string, unknown> | null,
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
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur: { role: { name: string } }) => ur.role.name);
  }

  async syncRoles(userId: string, roleNames: string[]): Promise<void> {
    // Удаляем все существующие роли пользователя
    await this.prisma.userRole.deleteMany({ where: { userId } });

    if (roleNames.length === 0) return;

    // Находим ID ролей по именам
    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
    });

    // Создаём новые связи
    await this.prisma.userRole.createMany({
      data: roles.map((role: { id: string }) => ({
        userId,
        roleId: role.id,
      })),
    });
  }
}
