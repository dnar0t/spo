/**
 * PlanningAppModule
 *
 * Модуль приложения для Sprint Planning.
 * Связывает use cases (application layer) с реализациями репозиториев
 * (infrastructure layer) через механизм DI NestJS.
 *
 * Импортирует PlanningModule из infrastructure для доступа к Prisma репозиториям.
 * Предоставляет все use case'ы как провайдеры и регистрирует PlanningController.
 *
 * Use case'ы не имеют @Injectable() декоратора, поэтому используются
 * фабричные провайдеры для ручного связывания зависимостей.
 */
import { Module, Logger } from '@nestjs/common';
import { PlanningModule } from '../../infrastructure/prisma/planning.module';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPlannedTaskRepository } from '../../infrastructure/prisma/repositories/prisma-planned-task.repository';
import { PrismaSprintPlanRepository } from '../../infrastructure/prisma/repositories/prisma-sprint-plan.repository';
import { PrismaPeriodTransitionRepository } from '../../infrastructure/prisma/repositories/prisma-period-transition.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { PlanningController } from './planning.controller';
import { CreatePeriodUseCase } from '../../application/planning/use-cases/create-period.use-case';
import { UpdatePeriodUseCase } from '../../application/planning/use-cases/update-period.use-case';
import { GetPeriodsUseCase } from '../../application/planning/use-cases/get-periods.use-case';
import { GetPeriodDetailUseCase } from '../../application/planning/use-cases/get-period-detail.use-case';
import { GetBacklogUseCase } from '../../application/planning/use-cases/get-backlog.use-case';
import { GetCapacityUseCase } from '../../application/planning/use-cases/get-capacity.use-case';
import { AssignTaskUseCase } from '../../application/planning/use-cases/assign-task.use-case';
import { UnassignTaskUseCase } from '../../application/planning/use-cases/unassign-task.use-case';
import { FixPlanUseCase } from '../../application/planning/use-cases/fix-plan.use-case';
import { TransitionPeriodUseCase } from '../../application/planning/use-cases/transition-period.use-case';
import { DeletePeriodUseCase } from '../../application/planning/use-cases/delete-period.use-case';
import { UpdateTaskSortUseCase } from '../../application/planning/use-cases/update-task-sort.use-case';
import { UpdateTaskReadinessUseCase } from '../../application/planning/use-cases/update-task-readiness.use-case';
import { GetPlanVersionsUseCase } from '../../application/planning/use-cases/get-plan-versions.use-case';
import { PlanFixedEvent } from '../../domain/events/plan-fixed.event';

/**
 * Простая реализация EventBus для FixPlanUseCase.
 * В production будет заменена на полноценный EventBus / Outbox.
 */
class ConsoleEventBus {
  private readonly logger = new Logger('EventBus');

  async publish(event: PlanFixedEvent): Promise<void> {
    this.logger.log(`Publishing event: ${event.eventName}`);
    const payload = event.toJSON();
    this.logger.debug(`Event payload: ${JSON.stringify(payload)}`);
  }
}

@Module({
  imports: [PlanningModule],
  controllers: [PlanningController],
  providers: [
    // ====================================================================
    // Use Case Factory Providers
    //
    // Use case'ы используют конструкторную DI с интерфейсами вместо классов,
    // что невозможно для автоматического разрешения NestJS.
    // Поэтому каждый use case создаётся через фабрику с явным
    // перечислением всех зависимостей.
    // ====================================================================

    // --- CreatePeriodUseCase ---
    // Зависимости: ReportingPeriodRepository, UserRepository
    {
      provide: CreatePeriodUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        userRepo: PrismaUserRepository,
      ) => new CreatePeriodUseCase(reportingPeriodRepo, userRepo),
      inject: [PrismaReportingPeriodRepository, PrismaUserRepository],
    },

    // --- UpdatePeriodUseCase ---
    // Зависимости: ReportingPeriodRepository
    {
      provide: UpdatePeriodUseCase,
      useFactory: (reportingPeriodRepo: PrismaReportingPeriodRepository) =>
        new UpdatePeriodUseCase(reportingPeriodRepo),
      inject: [PrismaReportingPeriodRepository],
    },

    // --- GetPeriodsUseCase ---
    // Зависимости: ReportingPeriodRepository
    {
      provide: GetPeriodsUseCase,
      useFactory: (reportingPeriodRepo: PrismaReportingPeriodRepository) =>
        new GetPeriodsUseCase(reportingPeriodRepo),
      inject: [PrismaReportingPeriodRepository],
    },

    // --- GetPeriodDetailUseCase ---
    // Зависимости: ReportingPeriodRepository
    {
      provide: GetPeriodDetailUseCase,
      useFactory: (reportingPeriodRepo: PrismaReportingPeriodRepository) =>
        new GetPeriodDetailUseCase(reportingPeriodRepo),
      inject: [PrismaReportingPeriodRepository],
    },

    // --- GetBacklogUseCase ---
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository
    {
      provide: GetBacklogUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
      ) => new GetBacklogUseCase(reportingPeriodRepo, plannedTaskRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPlannedTaskRepository],
    },

    // --- GetCapacityUseCase ---
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository, UserRepository
    {
      provide: GetCapacityUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        userRepo: PrismaUserRepository,
      ) => new GetCapacityUseCase(reportingPeriodRepo, plannedTaskRepo, userRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPlannedTaskRepository, PrismaUserRepository],
    },

    // --- AssignTaskUseCase ---
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository
    {
      provide: AssignTaskUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
      ) => new AssignTaskUseCase(reportingPeriodRepo, plannedTaskRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPlannedTaskRepository],
    },

    // --- UnassignTaskUseCase ---
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository
    {
      provide: UnassignTaskUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
      ) => new UnassignTaskUseCase(reportingPeriodRepo, plannedTaskRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPlannedTaskRepository],
    },

    // --- FixPlanUseCase ---
    // Зависимости: ReportingPeriodRepository, SprintPlanRepository,
    //              PlannedTaskRepository, PeriodTransitionRepository, EventBus
    {
      provide: FixPlanUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        sprintPlanRepo: PrismaSprintPlanRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        periodTransitionRepo: PrismaPeriodTransitionRepository,
        eventBus: ConsoleEventBus,
      ) =>
        new FixPlanUseCase(
          reportingPeriodRepo,
          sprintPlanRepo,
          plannedTaskRepo,
          periodTransitionRepo,
          eventBus,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaSprintPlanRepository,
        PrismaPlannedTaskRepository,
        PrismaPeriodTransitionRepository,
        ConsoleEventBus,
      ],
    },

    // --- TransitionPeriodUseCase ---
    // Зависимости: ReportingPeriodRepository, PeriodTransitionRepository
    {
      provide: TransitionPeriodUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        periodTransitionRepo: PrismaPeriodTransitionRepository,
      ) => new TransitionPeriodUseCase(reportingPeriodRepo, periodTransitionRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPeriodTransitionRepository],
    },

    // --- DeletePeriodUseCase ---
    // Зависимости: ReportingPeriodRepository
    {
      provide: DeletePeriodUseCase,
      useFactory: (reportingPeriodRepo: PrismaReportingPeriodRepository) =>
        new DeletePeriodUseCase(reportingPeriodRepo),
      inject: [PrismaReportingPeriodRepository],
    },

    // --- UpdateTaskSortUseCase ---
    // Зависимости: PlannedTaskRepository
    {
      provide: UpdateTaskSortUseCase,
      useFactory: (plannedTaskRepo: PrismaPlannedTaskRepository) =>
        new UpdateTaskSortUseCase(plannedTaskRepo),
      inject: [PrismaPlannedTaskRepository],
    },

    // --- UpdateTaskReadinessUseCase ---
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository
    {
      provide: UpdateTaskReadinessUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
      ) => new UpdateTaskReadinessUseCase(reportingPeriodRepo, plannedTaskRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPlannedTaskRepository],
    },

    // --- GetPlanVersionsUseCase ---
    // Зависимости: ReportingPeriodRepository, SprintPlanRepository
    {
      provide: GetPlanVersionsUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        sprintPlanRepo: PrismaSprintPlanRepository,
      ) => new GetPlanVersionsUseCase(reportingPeriodRepo, sprintPlanRepo),
      inject: [PrismaReportingPeriodRepository, PrismaSprintPlanRepository],
    },

    // ====================================================================
    // EventBus Implementation
    // ====================================================================
    ConsoleEventBus,
  ],
})
export class PlanningAppModule {}
