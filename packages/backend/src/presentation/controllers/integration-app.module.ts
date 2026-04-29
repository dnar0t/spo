/**
 * IntegrationAppModule
 *
 * Модуль приложения для интеграций (YouTrack и др.).
 * Связывает use cases (application layer) с реализациями репозиториев
 * (infrastructure layer) через механизм DI NestJS.
 *
 * Подписывается на событие PlanFixedEvent через EventBusService и вызывает
 * ExportPlanToYouTrackUseCase для экспорта зафиксированного плана в YouTrack.
 *
 * EventBusService регистрируется глобально в AppModule и доступен
 * для инъекции во все модули без явного импорта.
 */
import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { YouTrackModule } from '../../infrastructure/youtrack/youtrack.module';
import { PlanningModule } from '../../infrastructure/prisma/planning.module';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPlannedTaskRepository } from '../../infrastructure/prisma/repositories/prisma-planned-task.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { YouTrackExportServiceImpl } from '../../infrastructure/youtrack/services/youtrack-export-service.impl';
import { EventBusService } from '../../infrastructure/event-bus.service';
import { ExportPlanToYouTrackUseCase } from '../../application/integration/use-cases/export-plan-to-youtrack.use-case';
import { PlanFixedEvent } from '../../domain/events/plan-fixed.event';

/**
 * Event handler для PlanFixedEvent.
 * При получении события запускает экспорт плана в YouTrack.
 */
class PlanFixedEventHandler implements OnModuleInit {
  private readonly logger = new Logger(PlanFixedEventHandler.name);

  constructor(
    private readonly exportPlanToYouTrackUseCase: ExportPlanToYouTrackUseCase,
    private readonly eventBusService: EventBusService,
  ) {}

  onModuleInit(): void {
    // Подписываемся на событие PlanFixedEvent при инициализации модуля
    this.eventBusService.subscribe(PlanFixedEvent.name, (event: PlanFixedEvent) =>
      this.handle(event),
    );
    this.logger.log('Subscribed to PlanFixedEvent');
  }

  async handle(event: PlanFixedEvent): Promise<void> {
    this.logger.log(
      `Handling PlanFixedEvent: periodId=${event.periodId}, version=${event.versionNumber}`,
    );

    try {
      const result = await this.exportPlanToYouTrackUseCase.execute({
        periodId: event.periodId,
        fixedByUserId: event.fixedByUserId,
      });

      this.logger.log(
        `Plan exported to YouTrack: ${result.succeeded} succeeded, ` +
          `${result.failed} failed, ${result.skipped} skipped`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(`YouTrack export errors: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to export plan to YouTrack for period ${event.periodId}: ${errorMessage}`,
      );
    }
  }
}

@Module({
  imports: [YouTrackModule, PlanningModule],
  controllers: [],
  providers: [
    // ====================================================================
    // Use Case: ExportPlanToYouTrack
    //
    // Зависимости: ReportingPeriodRepository, PlannedTaskRepository,
    //              UserRepository, YouTrackExportService
    // ====================================================================
    {
      provide: ExportPlanToYouTrackUseCase,
      useFactory: (
        reportingPeriodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        userRepo: PrismaUserRepository,
        youtrackExportService: YouTrackExportServiceImpl,
      ) =>
        new ExportPlanToYouTrackUseCase(
          reportingPeriodRepo,
          plannedTaskRepo,
          userRepo,
          youtrackExportService,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPlannedTaskRepository,
        PrismaUserRepository,
        YouTrackExportServiceImpl,
      ],
    },

    // ====================================================================
    // Event Handler: PlanFixedEventHandler
    //
    // Зависимости: ExportPlanToYouTrackUseCase, EventBusService
    // Регистрирует подписку на PlanFixedEvent в onModuleInit().
    // EventBusService регистрируется глобально в AppModule.
    // ====================================================================
    {
      provide: PlanFixedEventHandler,
      useFactory: (
        exportPlanToYouTrackUseCase: ExportPlanToYouTrackUseCase,
        eventBusService: EventBusService,
      ) => new PlanFixedEventHandler(exportPlanToYouTrackUseCase, eventBusService),
      inject: [ExportPlanToYouTrackUseCase, EventBusService],
    },
  ],
  exports: [ExportPlanToYouTrackUseCase, PlanFixedEventHandler],
})
export class IntegrationAppModule {}
