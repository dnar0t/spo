import { Module } from '@nestjs/common';
import { ReportingModule } from '../../infrastructure/prisma/reporting.module';
import { ReportingController } from './reporting.controller';
import { WorkflowController } from './workflow.controller';
import { GetSummaryReportUseCase } from '../../application/reporting/use-cases/get-summary-report.use-case';
import { GetPersonalReportUseCase } from '../../application/reporting/use-cases/get-personal-report.use-case';
import { GetPeriodStatisticsUseCase } from '../../application/reporting/use-cases/get-period-statistics.use-case';
import { SubmitManagerEvaluationUseCase } from '../../application/reporting/use-cases/submit-manager-evaluation.use-case';
import { SubmitBusinessEvaluationUseCase } from '../../application/reporting/use-cases/submit-business-evaluation.use-case';
import { GeneratePersonalReportsUseCase } from '../../application/reporting/use-cases/generate-personal-reports.use-case';
import { GenerateSummaryReportUseCase } from '../../application/reporting/use-cases/generate-summary-report.use-case';
import { LoadFactUseCase } from '../../application/reporting/use-cases/load-fact.use-case';
import { TransitionPeriodUseCase } from '../../application/reporting/use-cases/transition-period.use-case';
import { GetPeriodHistoryUseCase } from '../../application/reporting/use-cases/get-period-history.use-case';
import { ReportCalculator } from '../../domain/services/report-calculator.service';
import { AccessControlService } from '../../domain/services/access-control.service';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { PrismaSummaryReportRepository } from '../../infrastructure/prisma/repositories/prisma-summary-report.repository';
import { PrismaManagerEvaluationRepository } from '../../infrastructure/prisma/repositories/prisma-manager-evaluation.repository';
import { PrismaBusinessEvaluationRepository } from '../../infrastructure/prisma/repositories/prisma-business-evaluation.repository';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPeriodTransitionRepository } from '../../infrastructure/prisma/repositories/prisma-period-transition.repository';
import { PrismaPlannedTaskRepository } from '../../infrastructure/prisma/repositories/prisma-planned-task.repository';
import { PrismaEmployeeRateRepository } from '../../infrastructure/prisma/repositories/prisma-employee-rate.repository';
import { PrismaFormulaConfigRepository } from '../../infrastructure/prisma/repositories/prisma-formula-config.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';
import { SyncEngine } from '../../infrastructure/youtrack/sync-engine';

@Module({
  imports: [ReportingModule],
  controllers: [ReportingController, WorkflowController],
  providers: [
    // ─── Use Cases ───
    {
      provide: GetSummaryReportUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        reportCalc: ReportCalculator,
      ) => new GetSummaryReportUseCase(periodRepo, summaryReportRepo, reportCalc),
      inject: [PrismaReportingPeriodRepository, PrismaSummaryReportRepository, ReportCalculator],
    },
    {
      provide: GetPersonalReportUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        userRepo: PrismaUserRepository,
        accessControlService: AccessControlService,
      ) =>
        new GetPersonalReportUseCase(
          periodRepo,
          personalReportRepo,
          userRepo,
          accessControlService,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        PrismaUserRepository,
        AccessControlService,
      ],
    },
    {
      provide: GetPeriodStatisticsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        reportCalc: ReportCalculator,
      ) => new GetPeriodStatisticsUseCase(periodRepo, summaryReportRepo, reportCalc),
      inject: [PrismaReportingPeriodRepository, PrismaSummaryReportRepository, ReportCalculator],
    },
    {
      provide: SubmitManagerEvaluationUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        managerEvalRepo: PrismaManagerEvaluationRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        employeeRateRepo: PrismaEmployeeRateRepository,
        formulaRepo: PrismaFormulaConfigRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        businessEvalRepo: PrismaBusinessEvaluationRepository,
        accessControlService: AccessControlService,
        reportCalc: ReportCalculator,
      ) =>
        new SubmitManagerEvaluationUseCase(
          periodRepo,
          managerEvalRepo,
          personalReportRepo,
          employeeRateRepo,
          formulaRepo,
          plannedTaskRepo,
          businessEvalRepo,
          accessControlService,
          reportCalc,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaManagerEvaluationRepository,
        PrismaPersonalReportRepository,
        PrismaEmployeeRateRepository,
        PrismaFormulaConfigRepository,
        PrismaPlannedTaskRepository,
        PrismaBusinessEvaluationRepository,
        AccessControlService,
        ReportCalculator,
      ],
    },
    {
      provide: SubmitBusinessEvaluationUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        businessEvalRepo: PrismaBusinessEvaluationRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        managerEvalRepo: PrismaManagerEvaluationRepository,
        employeeRateRepo: PrismaEmployeeRateRepository,
        formulaRepo: PrismaFormulaConfigRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        accessControlService: AccessControlService,
        reportCalc: ReportCalculator,
      ) =>
        new SubmitBusinessEvaluationUseCase(
          periodRepo,
          businessEvalRepo,
          personalReportRepo,
          managerEvalRepo,
          employeeRateRepo,
          formulaRepo,
          plannedTaskRepo,
          accessControlService,
          reportCalc,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaBusinessEvaluationRepository,
        PrismaPersonalReportRepository,
        PrismaManagerEvaluationRepository,
        PrismaEmployeeRateRepository,
        PrismaFormulaConfigRepository,
        PrismaPlannedTaskRepository,
        AccessControlService,
        ReportCalculator,
      ],
    },
    {
      provide: GeneratePersonalReportsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        managerEvalRepo: PrismaManagerEvaluationRepository,
        businessEvalRepo: PrismaBusinessEvaluationRepository,
        employeeRateRepo: PrismaEmployeeRateRepository,
        formulaRepo: PrismaFormulaConfigRepository,
        userRepo: PrismaUserRepository,
        reportCalc: ReportCalculator,
      ) =>
        new GeneratePersonalReportsUseCase(
          periodRepo,
          plannedTaskRepo,
          personalReportRepo,
          managerEvalRepo,
          businessEvalRepo,
          employeeRateRepo,
          formulaRepo,
          userRepo,
          reportCalc,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPlannedTaskRepository,
        PrismaPersonalReportRepository,
        PrismaManagerEvaluationRepository,
        PrismaBusinessEvaluationRepository,
        PrismaEmployeeRateRepository,
        PrismaFormulaConfigRepository,
        PrismaUserRepository,
        ReportCalculator,
      ],
    },
    {
      provide: GenerateSummaryReportUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        reportCalc: ReportCalculator,
      ) =>
        new GenerateSummaryReportUseCase(
          periodRepo,
          personalReportRepo,
          summaryReportRepo,
          reportCalc,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        PrismaSummaryReportRepository,
        ReportCalculator,
      ],
    },
    {
      provide: LoadFactUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        transitionRepo: PrismaPeriodTransitionRepository,
        plannedTaskRepo: PrismaPlannedTaskRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        managerEvalRepo: PrismaManagerEvaluationRepository,
        businessEvalRepo: PrismaBusinessEvaluationRepository,
        rateRepo: PrismaEmployeeRateRepository,
        formulaRepo: PrismaFormulaConfigRepository,
        userRepo: PrismaUserRepository,
        syncEngine: SyncEngine,
        reportCalc: ReportCalculator,
      ) =>
        new LoadFactUseCase(
          periodRepo,
          transitionRepo,
          plannedTaskRepo,
          personalReportRepo,
          summaryReportRepo,
          managerEvalRepo,
          businessEvalRepo,
          rateRepo,
          formulaRepo,
          userRepo,
          syncEngine,
          reportCalc,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPeriodTransitionRepository,
        PrismaPlannedTaskRepository,
        PrismaPersonalReportRepository,
        PrismaSummaryReportRepository,
        PrismaManagerEvaluationRepository,
        PrismaBusinessEvaluationRepository,
        PrismaEmployeeRateRepository,
        PrismaFormulaConfigRepository,
        PrismaUserRepository,
        SyncEngine,
        ReportCalculator,
      ],
    },
    {
      provide: TransitionPeriodUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        transitionRepo: PrismaPeriodTransitionRepository,
      ) => new TransitionPeriodUseCase(periodRepo, transitionRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPeriodTransitionRepository],
    },
    {
      provide: GetPeriodHistoryUseCase,
      useFactory: (transitionRepo: PrismaPeriodTransitionRepository) =>
        new GetPeriodHistoryUseCase(transitionRepo),
      inject: [PrismaPeriodTransitionRepository],
    },

    // ─── Domain Services ───
    ReportCalculator,
    AccessControlService,
  ],
  exports: [],
})
export class ReportingAppModule {}
