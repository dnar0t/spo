import { Module } from '@nestjs/common';
import { ExportModule } from '../../infrastructure/export/export.module';
import { ExportController } from './export.controller';
import { ExportPlanUseCase } from '../../application/export/use-cases/export-plan.use-case';
import { ExportSummaryReportUseCase } from '../../application/export/use-cases/export-summary-report.use-case';
import { ExportPersonalReportUseCase } from '../../application/export/use-cases/export-personal-report.use-case';
import { ExportAuditLogUseCase } from '../../application/export/use-cases/export-audit-log.use-case';
import { ExportJsonAccountingUseCase } from '../../application/export/use-cases/export-json-accounting.use-case';
import { GetExportJobsUseCase } from '../../application/export/use-cases/get-export-jobs.use-case';
import { CleanupExpiredExportsUseCase } from '../../application/export/use-cases/cleanup-expired-exports.use-case';
import { ExportJobRepository } from '../../domain/repositories/export-job.repository';
import { ReportingPeriodRepository } from '../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../domain/repositories/personal-report.repository';
import { SummaryReportRepository } from '../../domain/repositories/summary-report.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PlannedTaskRepository } from '../../domain/repositories/planned-task.repository';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { PrismaSummaryReportRepository } from '../../infrastructure/prisma/repositories/prisma-summary-report.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { PrismaPlannedTaskRepository } from '../../infrastructure/prisma/repositories/prisma-planned-task.repository';
import { IExportService } from '../../application/export/ports/export-service';
import { IFileStorage } from '../../application/export/ports/file-storage';

@Module({
  imports: [ExportModule],
  controllers: [ExportController],
  providers: [
    // ─── Export Use Cases ───
    {
      provide: ExportPlanUseCase,
      useFactory: (
        periodRepo: ReportingPeriodRepository,
        exportJobRepo: ExportJobRepository,
        exportService: IExportService,
        fileStorage: IFileStorage,
      ) => new ExportPlanUseCase(periodRepo, exportJobRepo, exportService, fileStorage),
      inject: [
        PrismaReportingPeriodRepository,
        ExportJobRepository,
        'IExportService',
        'IFileStorage',
      ],
    },
    {
      provide: ExportSummaryReportUseCase,
      useFactory: (
        periodRepo: ReportingPeriodRepository,
        exportJobRepo: ExportJobRepository,
        exportService: IExportService,
        fileStorage: IFileStorage,
      ) => new ExportSummaryReportUseCase(periodRepo, exportJobRepo, exportService, fileStorage),
      inject: [
        PrismaReportingPeriodRepository,
        ExportJobRepository,
        'IExportService',
        'IFileStorage',
      ],
    },
    {
      provide: ExportPersonalReportUseCase,
      useFactory: (
        exportJobRepo: ExportJobRepository,
        periodRepo: ReportingPeriodRepository,
        personalReportRepo: PersonalReportRepository,
        userRepo: UserRepository,
        exportService: IExportService,
        fileStorage: IFileStorage,
      ) =>
        new ExportPersonalReportUseCase(
          exportJobRepo,
          periodRepo,
          personalReportRepo,
          userRepo,
          exportService,
          fileStorage,
        ),
      inject: [
        ExportJobRepository,
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        PrismaUserRepository,
        'IExportService',
        'IFileStorage',
      ],
    },
    {
      provide: ExportAuditLogUseCase,
      useFactory: (
        exportJobRepo: ExportJobRepository,
        exportService: IExportService,
        fileStorage: IFileStorage,
      ) => new ExportAuditLogUseCase(exportJobRepo, exportService, fileStorage),
      inject: [ExportJobRepository, 'IExportService', 'IFileStorage'],
    },
    {
      provide: ExportJsonAccountingUseCase,
      useFactory: (
        exportJobRepo: ExportJobRepository,
        periodRepo: ReportingPeriodRepository,
        personalReportRepo: PersonalReportRepository,
        summaryReportRepo: SummaryReportRepository,
        exportService: IExportService,
        fileStorage: IFileStorage,
      ) =>
        new ExportJsonAccountingUseCase(
          exportJobRepo,
          periodRepo,
          personalReportRepo,
          summaryReportRepo,
          exportService,
          fileStorage,
        ),
      inject: [
        ExportJobRepository,
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        PrismaSummaryReportRepository,
        'IExportService',
        'IFileStorage',
      ],
    },
    {
      provide: GetExportJobsUseCase,
      useFactory: (exportJobRepo: ExportJobRepository) =>
        new GetExportJobsUseCase(exportJobRepo),
      inject: [ExportJobRepository],
    },
    {
      provide: CleanupExpiredExportsUseCase,
      useFactory: (
        exportJobRepo: ExportJobRepository,
        fileStorage: IFileStorage,
      ) => new CleanupExpiredExportsUseCase(exportJobRepo, fileStorage),
      inject: [ExportJobRepository, 'IFileStorage'],
    },
  ],
  exports: [],
})
export class ExportAppModule {}
