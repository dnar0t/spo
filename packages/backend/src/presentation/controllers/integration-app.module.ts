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
import { YouTrackRepositoryImpl } from '../../infrastructure/youtrack/services/youtrack-repository.impl';
import { EventBusService } from '../../infrastructure/event-bus.service';
import { YouTrackController } from './youtrack.controller';
import { ExportPlanToYouTrackUseCase } from '../../application/integration/use-cases/export-plan-to-youtrack.use-case';
import { GetYouTrackStatusUseCase } from '../../application/integration/use-cases/get-status.use-case';
import { TestYouTrackConnectionUseCase } from '../../application/integration/use-cases/test-connection.use-case';
import { RunYouTrackSyncUseCase } from '../../application/integration/use-cases/start-sync.use-case';
import { GetSyncRunsUseCase } from '../../application/integration/use-cases/get-sync-runs.use-case';
import { GetSyncRunDetailUseCase } from '../../application/integration/use-cases/get-sync-run-detail.use-case';
import { GetYouTrackIssuesUseCase } from '../../application/integration/use-cases/get-issues.use-case';
import { GetYouTrackStatsUseCase } from '../../application/integration/use-cases/get-stats.use-case';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
} from '../../application/integration/ports/youtrack-repository';
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
  controllers: [YouTrackController],
  providers: [
    // ====================================================================
    // Репозиторий YouTrack (порт → реализация)
    //
    // Регистрируем реализацию IYouTrackRepository под символическим токеном,
    // чтобы use cases могли инжектить порт через @Inject(YOUTRACK_REPOSITORY).
    // ====================================================================
    {
      provide: YOUTRACK_REPOSITORY,
      useClass: YouTrackRepositoryImpl,
    },

    // ====================================================================
    // Use Case: GetYouTrackStatusUseCase
    //
    // Получение статуса подключения к YouTrack.
    // ====================================================================
    {
      provide: GetYouTrackStatusUseCase,
      useFactory: (repository: IYouTrackRepository) => new GetYouTrackStatusUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: TestYouTrackConnectionUseCase
    //
    // Тест подключения к YouTrack API.
    // ====================================================================
    {
      provide: TestYouTrackConnectionUseCase,
      useFactory: (repository: IYouTrackRepository) =>
        new TestYouTrackConnectionUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: RunYouTrackSyncUseCase
    //
    // Запуск полной синхронизации с YouTrack.
    // ====================================================================
    {
      provide: RunYouTrackSyncUseCase,
      useFactory: (repository: IYouTrackRepository) => new RunYouTrackSyncUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: GetSyncRunsUseCase
    //
    // Получение истории синхронизаций.
    // ====================================================================
    {
      provide: GetSyncRunsUseCase,
      useFactory: (repository: IYouTrackRepository) => new GetSyncRunsUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: GetSyncRunDetailUseCase
    //
    // Получение деталей конкретной синхронизации.
    // ====================================================================
    {
      provide: GetSyncRunDetailUseCase,
      useFactory: (repository: IYouTrackRepository) => new GetSyncRunDetailUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: GetYouTrackIssuesUseCase
    //
    // Получение списка синхронизированных задач.
    // ====================================================================
    {
      provide: GetYouTrackIssuesUseCase,
      useFactory: (repository: IYouTrackRepository) => new GetYouTrackIssuesUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

    // ====================================================================
    // Use Case: GetYouTrackStatsUseCase
    //
    // Получение статистики по интеграции.
    // ====================================================================
    {
      provide: GetYouTrackStatsUseCase,
      useFactory: (repository: IYouTrackRepository) => new GetYouTrackStatsUseCase(repository),
      inject: [YOUTRACK_REPOSITORY],
    },

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
