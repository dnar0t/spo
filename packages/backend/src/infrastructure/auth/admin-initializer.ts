import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AdminInitializer
 *
 * Сервис, гарантирующий существование администратора системы при старте.
 *
 * При запуске приложения проверяет:
 * 1. Существование роли 'admin' (id: role-admin)
 * 2. Существование пользователя 'admin' (login: admin)
 * 3. Назначение роли admin пользователю admin
 *
 * Если чего-то не хватает — создаёт автоматически.
 * Это гарантирует, что локальный администратор всегда доступен
 * независимо от статуса LDAP, seed или синхронизации пользователей.
 */
@Injectable()
export class AdminInitializer implements OnModuleInit {
  private readonly logger = new Logger(AdminInitializer.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAdminExists();
  }

  private async ensureAdminExists(): Promise<void> {
    try {
      // 1. Убеждаемся, что роль 'admin' существует
      const adminRole = await this.prisma.role.upsert({
        where: { id: 'role-admin' },
        update: {},
        create: {
          id: 'role-admin',
          name: 'admin',
          description: 'Администратор системы',
        },
      });
      this.logger.debug(`Admin role ensured: ${adminRole.name} (${adminRole.id})`);

      // 2. Убеждаемся, что пользователь 'admin' существует
      const adminUser = await this.prisma.user.upsert({
        where: { login: 'admin' },
        update: {
          // Обновляем только если пользователь был деактивирован
          isBlocked: false,
        },
        create: {
          id: 'user-admin',
          login: 'admin',
          email: 'admin@spo.local',
          fullName: 'Администратор Системы',
          isActive: true,
          isBlocked: false,
        },
      });
      this.logger.debug(
        `Admin user ensured: ${adminUser.login} (active=${adminUser.isActive})`,
      );

      // 3. Назначаем роль admin пользователю admin
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
      this.logger.debug(`Admin role assigned to admin user`);
    } catch (error) {
      this.logger.error(
        `Failed to ensure admin user exists: ${(error as Error).message}`,
      );
      // Не блокируем запуск приложения
    }
  }
}
