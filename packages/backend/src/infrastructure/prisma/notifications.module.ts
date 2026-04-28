/**
 * NotificationsModule (Infrastructure)
 *
 * Предоставляет реализации репозиториев для модуля уведомлений.
 * Импортирует PrismaModule для доступа к БД.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaNotificationTemplateRepository } from './repositories/prisma-notification-template.repository';
import { PrismaNotificationRunRepository } from './repositories/prisma-notification-run.repository';
import { PrismaSmtpConfigRepository } from './repositories/prisma-smtp-config.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaNotificationTemplateRepository,
    PrismaNotificationRunRepository,
    PrismaSmtpConfigRepository,
  ],
  exports: [
    PrismaNotificationTemplateRepository,
    PrismaNotificationRunRepository,
    PrismaSmtpConfigRepository,
  ],
})
export class NotificationsModule {}
