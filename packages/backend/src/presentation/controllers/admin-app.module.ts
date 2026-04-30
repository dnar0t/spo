/**
 * AdminAppModule
 *
 * Модуль приложения для Administration and Dictionaries.
 * Связывает use cases (application layer) с реализациями репозиториев
 * (infrastructure layer) через механизм DI NestJS.
 *
 * Импортирует AdministrationModule из infrastructure для доступа к Prisma репозиториям.
 * Также импортирует AuthModule для доступа к IAuditLogger.
 * Предоставляет все use case'ы как провайдеры и регистрирует AdminController.
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { AdministrationModule } from '../../infrastructure/prisma/administration.module';
import { PrismaEmployeeProfileRepository } from '../../infrastructure/prisma/repositories/prisma-employee-profile.repository';
import { PrismaRefreshSessionRepository } from '../../infrastructure/prisma/repositories/prisma-refresh-session.repository';
import { PrismaAuditLogRepository } from '../../infrastructure/prisma/repositories/prisma-audit-log.repository';
import { PrismaEmployeeRateRepository } from '../../infrastructure/prisma/repositories/prisma-employee-rate.repository';
import { PrismaFormulaConfigRepository } from '../../infrastructure/prisma/repositories/prisma-formula-config.repository';
import { PrismaEvaluationScaleRepository } from '../../infrastructure/prisma/repositories/prisma-evaluation-scale.repository';
import { PrismaWorkRoleRepository } from '../../infrastructure/prisma/repositories/prisma-work-role.repository';
import { PrismaPlanningSettingsRepository } from '../../infrastructure/prisma/repositories/prisma-planning-settings.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AdminController } from './admin.controller';
import { CreateUserUseCase } from '../../application/administration/use-cases/create-user.use-case';
import { UpdateUserUseCase } from '../../application/administration/use-cases/update-user.use-case';
import { DeactivateUserUseCase } from '../../application/administration/use-cases/deactivate-user.use-case';
import { AssignRolesUseCase } from '../../application/administration/use-cases/assign-roles.use-case';
import { AssignManagerUseCase } from '../../application/administration/use-cases/assign-manager.use-case';
import { GetUsersUseCase } from '../../application/administration/use-cases/get-users.use-case';
import { CreateRateUseCase } from '../../application/administration/use-cases/create-rate.use-case';
import { GetRatesUseCase } from '../../application/administration/use-cases/get-rates.use-case';
import { DeleteRateUseCase } from '../../application/administration/use-cases/delete-rate.use-case';
import { UpdateFormulaUseCase } from '../../application/administration/use-cases/update-formula.use-case';
import { GetFormulasUseCase } from '../../application/administration/use-cases/get-formulas.use-case';
import { UpdateEvaluationScaleUseCase } from '../../application/administration/use-cases/update-evaluation-scale.use-case';
import { GetEvaluationScalesUseCase } from '../../application/administration/use-cases/get-evaluation-scales.use-case';
import { UpdatePlanningSettingsUseCase } from '../../application/administration/use-cases/update-planning-settings.use-case';
import { GetPlanningSettingsUseCase } from '../../application/administration/use-cases/get-planning-settings.use-case';
import { GetDictionariesUseCase } from '../../application/administration/use-cases/get-dictionaries.use-case';
import { GetAuditLogUseCase } from '../../application/administration/use-cases/get-audit-log.use-case';
import { GetIntegrationsUseCase } from '../../application/administration/use-cases/get-integrations.use-case';
import { UpdateIntegrationUseCase } from '../../application/administration/use-cases/update-integration.use-case';
import { GetActiveSessionsUseCase } from '../../application/administration/use-cases/get-active-sessions.use-case';
import { GetSensitiveChangesUseCase } from '../../application/administration/use-cases/get-sensitive-changes.use-case';
import { AUDIT_LOGGER, IAuditLogger } from '../../application/auth/ports/audit-logger';

@Module({
  imports: [AdministrationModule, AuthModule],
  controllers: [AdminController],
  providers: [
    // ====================================================================
    // Use Case Factory Providers
    //
    // Use case'ы используют конструкторную DI с интерфейсами вместо классов,
    // что невозможно для автоматического разрешения NestJS.
    // Поэтому каждый use case создаётся через фабрику с явным
    // перечислением всех зависимостей.
    // ====================================================================

    // --- CreateUserUseCase ---
    // Зависимости: UserRepository, IAuditLogger
    {
      provide: CreateUserUseCase,
      useFactory: (userRepo: PrismaUserRepository, auditLogger: IAuditLogger) =>
        new CreateUserUseCase(userRepo, auditLogger),
      inject: [PrismaUserRepository, AUDIT_LOGGER],
    },

    // --- UpdateUserUseCase ---
    // Зависимости: UserRepository, IAuditLogger
    {
      provide: UpdateUserUseCase,
      useFactory: (userRepo: PrismaUserRepository, auditLogger: IAuditLogger) =>
        new UpdateUserUseCase(userRepo, auditLogger),
      inject: [PrismaUserRepository, AUDIT_LOGGER],
    },

    // --- DeactivateUserUseCase ---
    // Зависимости: UserRepository, IAuditLogger
    {
      provide: DeactivateUserUseCase,
      useFactory: (userRepo: PrismaUserRepository, auditLogger: IAuditLogger) =>
        new DeactivateUserUseCase(userRepo, auditLogger),
      inject: [PrismaUserRepository, AUDIT_LOGGER],
    },

    // --- AssignRolesUseCase ---
    // Зависимости: UserRepository, IAuditLogger
    {
      provide: AssignRolesUseCase,
      useFactory: (userRepo: PrismaUserRepository, auditLogger: IAuditLogger) =>
        new AssignRolesUseCase(userRepo, auditLogger),
      inject: [PrismaUserRepository, AUDIT_LOGGER],
    },

    // --- AssignManagerUseCase ---
    // Зависимости: UserRepository, EmployeeProfileRepository, IAuditLogger
    {
      provide: AssignManagerUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        employeeProfileRepo: PrismaEmployeeProfileRepository,
        auditLogger: IAuditLogger,
      ) => new AssignManagerUseCase(userRepo, employeeProfileRepo, auditLogger),
      inject: [PrismaUserRepository, PrismaEmployeeProfileRepository, AUDIT_LOGGER],
    },

    // --- GetUsersUseCase ---
    // Зависимости: UserRepository
    {
      provide: GetUsersUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new GetUsersUseCase(userRepo),
      inject: [PrismaUserRepository],
    },

    // --- CreateRateUseCase ---
    // Зависимости: EmployeeRateRepository, IAuditLogger
    {
      provide: CreateRateUseCase,
      useFactory: (rateRepo: PrismaEmployeeRateRepository, auditLogger: IAuditLogger) =>
        new CreateRateUseCase(rateRepo, auditLogger),
      inject: [PrismaEmployeeRateRepository, AUDIT_LOGGER],
    },

    // --- GetRatesUseCase ---
    // Зависимости: EmployeeRateRepository
    {
      provide: GetRatesUseCase,
      useFactory: (rateRepo: PrismaEmployeeRateRepository) => new GetRatesUseCase(rateRepo),
      inject: [PrismaEmployeeRateRepository],
    },

    // --- DeleteRateUseCase ---
    // Зависимости: EmployeeRateRepository, IAuditLogger
    {
      provide: DeleteRateUseCase,
      useFactory: (rateRepo: PrismaEmployeeRateRepository, auditLogger: IAuditLogger) =>
        new DeleteRateUseCase(rateRepo, auditLogger),
      inject: [PrismaEmployeeRateRepository, AUDIT_LOGGER],
    },

    // --- UpdateFormulaUseCase ---
    // Зависимости: FormulaConfigRepository, IAuditLogger
    {
      provide: UpdateFormulaUseCase,
      useFactory: (formulaRepo: PrismaFormulaConfigRepository, auditLogger: IAuditLogger) =>
        new UpdateFormulaUseCase(formulaRepo, auditLogger),
      inject: [PrismaFormulaConfigRepository, AUDIT_LOGGER],
    },

    // --- GetFormulasUseCase ---
    // Зависимости: FormulaConfigRepository
    {
      provide: GetFormulasUseCase,
      useFactory: (formulaRepo: PrismaFormulaConfigRepository) =>
        new GetFormulasUseCase(formulaRepo),
      inject: [PrismaFormulaConfigRepository],
    },

    // --- UpdateEvaluationScaleUseCase ---
    // Зависимости: EvaluationScaleRepository, IAuditLogger
    {
      provide: UpdateEvaluationScaleUseCase,
      useFactory: (scaleRepo: PrismaEvaluationScaleRepository, auditLogger: IAuditLogger) =>
        new UpdateEvaluationScaleUseCase(scaleRepo, auditLogger),
      inject: [PrismaEvaluationScaleRepository, AUDIT_LOGGER],
    },

    // --- GetEvaluationScalesUseCase ---
    // Зависимости: EvaluationScaleRepository
    {
      provide: GetEvaluationScalesUseCase,
      useFactory: (scaleRepo: PrismaEvaluationScaleRepository) =>
        new GetEvaluationScalesUseCase(scaleRepo),
      inject: [PrismaEvaluationScaleRepository],
    },

    // --- UpdatePlanningSettingsUseCase ---
    // Зависимости: PlanningSettingsRepository, IAuditLogger
    {
      provide: UpdatePlanningSettingsUseCase,
      useFactory: (settingsRepo: PrismaPlanningSettingsRepository, auditLogger: IAuditLogger) =>
        new UpdatePlanningSettingsUseCase(settingsRepo, auditLogger),
      inject: [PrismaPlanningSettingsRepository, AUDIT_LOGGER],
    },

    // --- GetPlanningSettingsUseCase ---
    // Зависимости: PlanningSettingsRepository
    {
      provide: GetPlanningSettingsUseCase,
      useFactory: (settingsRepo: PrismaPlanningSettingsRepository) =>
        new GetPlanningSettingsUseCase(settingsRepo),
      inject: [PrismaPlanningSettingsRepository],
    },

    // --- GetDictionariesUseCase ---
    // Зависимости: WorkRoleRepository, EvaluationScaleRepository, PrismaService
    {
      provide: GetDictionariesUseCase,
      useFactory: (
        workRoleRepo: PrismaWorkRoleRepository,
        scaleRepo: PrismaEvaluationScaleRepository,
        prisma: PrismaService,
      ) => new GetDictionariesUseCase(workRoleRepo, scaleRepo, prisma),
      inject: [PrismaWorkRoleRepository, PrismaEvaluationScaleRepository, PrismaService],
    },

    // --- GetAuditLogUseCase ---
    // Зависимости: IAuditLogger
    {
      provide: GetAuditLogUseCase,
      useFactory: (auditLogger: IAuditLogger) => new GetAuditLogUseCase(auditLogger),
      inject: [AUDIT_LOGGER],
    },

    // --- GetIntegrationsUseCase ---
    // Зависимости: PrismaService
    {
      provide: GetIntegrationsUseCase,
      useFactory: (prisma: PrismaService) => new GetIntegrationsUseCase(prisma),
      inject: [PrismaService],
    },

    // --- UpdateIntegrationUseCase ---
    // Зависимости: PrismaService, IAuditLogger
    {
      provide: UpdateIntegrationUseCase,
      useFactory: (prisma: PrismaService, auditLogger: IAuditLogger) =>
        new UpdateIntegrationUseCase(prisma, auditLogger),
      inject: [PrismaService, AUDIT_LOGGER],
    },

    // --- GetActiveSessionsUseCase ---
    // Зависимости: RefreshSessionRepository, UserRepository
    {
      provide: GetActiveSessionsUseCase,
      useFactory: (
        refreshSessionRepo: PrismaRefreshSessionRepository,
        userRepo: PrismaUserRepository,
      ) => new GetActiveSessionsUseCase(refreshSessionRepo, userRepo),
      inject: [PrismaRefreshSessionRepository, PrismaUserRepository],
    },

    // --- GetSensitiveChangesUseCase ---
    // Зависимости: AuditLogRepository (PrismaAuditLogRepository)
    {
      provide: GetSensitiveChangesUseCase,
      useFactory: (auditLogRepo: PrismaAuditLogRepository) =>
        new GetSensitiveChangesUseCase(auditLogRepo),
      inject: [PrismaAuditLogRepository],
    },
  ],
})
export class AdminAppModule {}
