/**
 * NotificationsAppModule
 *
 * Модуль приложения для Notifications.
 * Связывает use cases (application layer) с реализациями репозиториев
 * (infrastructure layer) через механизм DI NestJS.
 *
 * Импортирует NotificationsModule из infrastructure для доступа к Prisma репозиториям.
 * Также импортирует EmailModule и AuthModule.
 * Предоставляет все use case'ы как провайдеры и регистрирует NotificationsController.
 */
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../infrastructure/prisma/notifications.module';
import { EmailModule } from '../../infrastructure/email/email.module';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { PrismaNotificationTemplateRepository } from '../../infrastructure/prisma/repositories/prisma-notification-template.repository';
import { PrismaNotificationRunRepository } from '../../infrastructure/prisma/repositories/prisma-notification-run.repository';
import { PrismaSmtpConfigRepository } from '../../infrastructure/prisma/repositories/prisma-smtp-config.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { EMAIL_SENDER } from '../../application/notifications/ports/email-sender';
import { ENCRYPTION_SERVICE } from '../../application/auth/ports/encryption.service';
import { AUDIT_LOGGER } from '../../application/auth/ports/audit-logger';
import { UpdateSmtpConfigUseCase } from '../../application/notifications/use-cases/update-smtp-config.use-case';
import { GetSmtpConfigUseCase } from '../../application/notifications/use-cases/get-smtp-config.use-case';
import { CreateNotificationTemplateUseCase } from '../../application/notifications/use-cases/create-notification-template.use-case';
import { UpdateNotificationTemplateUseCase } from '../../application/notifications/use-cases/update-notification-template.use-case';
import { GetNotificationTemplatesUseCase } from '../../application/notifications/use-cases/get-notification-templates.use-case';
import { SendNotificationUseCase } from '../../application/notifications/use-cases/send-notification.use-case';
import { GetNotificationHistoryUseCase } from '../../application/notifications/use-cases/get-notification-history.use-case';
import { ProcessPendingNotificationsUseCase } from '../../application/notifications/use-cases/process-pending-notifications.use-case';
import { HandleWorkflowEventUseCase } from '../../application/notifications/use-cases/handle-workflow-event.use-case';
import { QueueService } from '../../infrastructure/queue/queue.service';

@Module({
  imports: [NotificationsModule, EmailModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    // ====================================================================
    // Infrastructure Services
    // ====================================================================
    QueueService,

    // ====================================================================
    // Use Case Factory Providers
    //
    // Use case'ы используют конструкторную DI с интерфейсами вместо классов,
    // что невозможно для автоматического разрешения NestJS.
    // Поэтому каждый use case создаётся через фабрику с явным
    // перечислением всех зависимостей.
    // ====================================================================

    // --- UpdateSmtpConfigUseCase ---
    // Зависимости: SmtpConfigRepository, IEncryptionService, IAuditLogger
    {
      provide: UpdateSmtpConfigUseCase,
      useFactory: (
        smtpConfigRepo: PrismaSmtpConfigRepository,
        encryptionService: IEncryptionService,
        auditLogger: IAuditLogger,
      ) => new UpdateSmtpConfigUseCase(smtpConfigRepo, encryptionService, auditLogger),
      inject: [PrismaSmtpConfigRepository, ENCRYPTION_SERVICE, AUDIT_LOGGER],
    },

    // --- GetSmtpConfigUseCase ---
    // Зависимости: SmtpConfigRepository, IEncryptionService
    {
      provide: GetSmtpConfigUseCase,
      useFactory: (
        smtpConfigRepo: PrismaSmtpConfigRepository,
        encryptionService: IEncryptionService,
      ) => new GetSmtpConfigUseCase(smtpConfigRepo, encryptionService),
      inject: [PrismaSmtpConfigRepository, ENCRYPTION_SERVICE],
    },

    // --- CreateNotificationTemplateUseCase ---
    // Зависимости: NotificationTemplateRepository, IAuditLogger
    {
      provide: CreateNotificationTemplateUseCase,
      useFactory: (templateRepo: PrismaNotificationTemplateRepository, auditLogger: IAuditLogger) =>
        new CreateNotificationTemplateUseCase(templateRepo, auditLogger),
      inject: [PrismaNotificationTemplateRepository, AUDIT_LOGGER],
    },

    // --- UpdateNotificationTemplateUseCase ---
    // Зависимости: NotificationTemplateRepository, IAuditLogger
    {
      provide: UpdateNotificationTemplateUseCase,
      useFactory: (templateRepo: PrismaNotificationTemplateRepository, auditLogger: IAuditLogger) =>
        new UpdateNotificationTemplateUseCase(templateRepo, auditLogger),
      inject: [PrismaNotificationTemplateRepository, AUDIT_LOGGER],
    },

    // --- GetNotificationTemplatesUseCase ---
    // Зависимости: NotificationTemplateRepository
    {
      provide: GetNotificationTemplatesUseCase,
      useFactory: (templateRepo: PrismaNotificationTemplateRepository) =>
        new GetNotificationTemplatesUseCase(templateRepo),
      inject: [PrismaNotificationTemplateRepository],
    },

    // --- SendNotificationUseCase ---
    // Зависимости: NotificationTemplateRepository, NotificationRunRepository, IEmailSender, IAuditLogger
    {
      provide: SendNotificationUseCase,
      useFactory: (
        templateRepo: PrismaNotificationTemplateRepository,
        runRepo: PrismaNotificationRunRepository,
        emailSender: IEmailSender,
        auditLogger: IAuditLogger,
      ) => new SendNotificationUseCase(templateRepo, runRepo, emailSender, auditLogger),
      inject: [
        PrismaNotificationTemplateRepository,
        PrismaNotificationRunRepository,
        EMAIL_SENDER,
        AUDIT_LOGGER,
      ],
    },

    // --- GetNotificationHistoryUseCase ---
    // Зависимости: NotificationRunRepository
    {
      provide: GetNotificationHistoryUseCase,
      useFactory: (runRepo: PrismaNotificationRunRepository) =>
        new GetNotificationHistoryUseCase(runRepo),
      inject: [PrismaNotificationRunRepository],
    },

    // --- ProcessPendingNotificationsUseCase ---
    // Зависимости: NotificationRunRepository, NotificationTemplateRepository, IEmailSender, IAuditLogger
    {
      provide: ProcessPendingNotificationsUseCase,
      useFactory: (
        runRepo: PrismaNotificationRunRepository,
        templateRepo: PrismaNotificationTemplateRepository,
        emailSender: IEmailSender,
        auditLogger: IAuditLogger,
      ) => new ProcessPendingNotificationsUseCase(runRepo, templateRepo, emailSender, auditLogger),
      inject: [
        PrismaNotificationRunRepository,
        PrismaNotificationTemplateRepository,
        EMAIL_SENDER,
        AUDIT_LOGGER,
      ],
    },

    // --- HandleWorkflowEventUseCase ---
    // Зависимости: SendNotificationUseCase, NotificationTemplateRepository, UserRepository, IEmailSender, IAuditLogger
    {
      provide: HandleWorkflowEventUseCase,
      useFactory: (
        sendNotificationUseCase: SendNotificationUseCase,
        templateRepo: PrismaNotificationTemplateRepository,
        userRepo: PrismaUserRepository,
        emailSender: IEmailSender,
        auditLogger: IAuditLogger,
      ) =>
        new HandleWorkflowEventUseCase(
          sendNotificationUseCase,
          templateRepo,
          userRepo,
          emailSender,
          auditLogger,
        ),
      inject: [
        SendNotificationUseCase,
        PrismaNotificationTemplateRepository,
        PrismaUserRepository,
        EMAIL_SENDER,
        AUDIT_LOGGER,
      ],
    },
  ],
  exports: [
    HandleWorkflowEventUseCase,
    SendNotificationUseCase,
    ProcessPendingNotificationsUseCase,
    QueueService,
  ],
})
export class NotificationsAppModule {}
