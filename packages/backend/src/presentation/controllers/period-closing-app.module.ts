/**
 * PeriodClosingAppModule (Presentation Layer)
 *
 * Модуль приложения для закрытия/переоткрытия периодов и управления снэпшотами.
 * Связывает use cases (application layer) с реализациями репозиториев
 * (infrastructure layer) через механизм DI NestJS.
 *
 * Импортирует PlanningModule и ReportingModule для доступа к Prisma репозиториям.
 * Регистрирует PeriodClosingController с необходимыми use case'ами.
 */
import { Module } from '@nestjs/common';
import { PlanningModule } from '../../infrastructure/prisma/planning.module';
import { ReportingModule } from '../../infrastructure/prisma/reporting.module';
import { FinanceModule } from '../../infrastructure/prisma/finance.module';
import { AuthModule } from '../../infrastructure/auth/auth.module';
import { PeriodClosingController } from './period-closing.controller';
import { ClosePeriodUseCase } from '../../application/planning/use-cases/close-period.use-case';
import { CreateSnapshotUseCase } from '../../application/planning/use-cases/create-snapshot.use-case';
import { ReopenPeriodUseCase } from '../../application/reporting/use-cases/reopen-period.use-case';
import { AccessControlService } from '../../domain/services/access-control.service';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPeriodTransitionRepository } from '../../infrastructure/prisma/repositories/prisma-period-transition.repository';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { PrismaSummaryReportRepository } from '../../infrastructure/prisma/repositories/prisma-summary-report.repository';
import { PrismaEmployeeRateRepository } from '../../infrastructure/prisma/repositories/prisma-employee-rate.repository';
import { PrismaFormulaConfigRepository } from '../../infrastructure/prisma/repositories/prisma-formula-config.repository';
import { PrismaEvaluationScaleRepository } from '../../infrastructure/prisma/repositories/prisma-evaluation-scale.repository';
import { PrismaPeriodSnapshotRepository } from '../../infrastructure/prisma/repositories/prisma-period-snapshot.repository';
import { IAuditLogger } from '../../application/auth/ports/audit-logger';

@Module({
  imports: [PlanningModule, ReportingModule, FinanceModule, AuthModule],
  controllers: [PeriodClosingController],
  providers: [
    // ─── Domain Services ───
    AccessControlService,

    // ─── Use Cases ───

    // CreateSnapshotUseCase
    // Зависимости: ReportingPeriodRepository, EmployeeRateRepository,
    //              FormulaConfigRepository, EvaluationScaleRepository,
    //              PersonalReportRepository, SummaryReportRepository,
    //              PeriodSnapshotRepository
    {
      provide: CreateSnapshotUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        rateRepo: PrismaEmployeeRateRepository,
        formulaRepo: PrismaFormulaConfigRepository,
        scaleRepo: PrismaEvaluationScaleRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        snapshotRepo: PrismaPeriodSnapshotRepository,
      ) =>
        new CreateSnapshotUseCase(
          periodRepo,
          rateRepo,
          formulaRepo,
          scaleRepo,
          personalReportRepo,
          summaryReportRepo,
          snapshotRepo,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaEmployeeRateRepository,
        PrismaFormulaConfigRepository,
        PrismaEvaluationScaleRepository,
        PrismaPersonalReportRepository,
        PrismaSummaryReportRepository,
        PrismaPeriodSnapshotRepository,
      ],
    },

    // ClosePeriodUseCase
    // Зависимости: ReportingPeriodRepository, PeriodTransitionRepository,
    //              PersonalReportRepository, SummaryReportRepository,
    //              CreateSnapshotUseCase, IAuditLogger
    {
      provide: ClosePeriodUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        transitionRepo: PrismaPeriodTransitionRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        summaryReportRepo: PrismaSummaryReportRepository,
        createSnapshotUseCase: CreateSnapshotUseCase,
        auditLogger: IAuditLogger,
      ) =>
        new ClosePeriodUseCase(
          periodRepo,
          transitionRepo,
          personalReportRepo,
          summaryReportRepo,
          createSnapshotUseCase,
          auditLogger,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPeriodTransitionRepository,
        PrismaPersonalReportRepository,
        PrismaSummaryReportRepository,
        CreateSnapshotUseCase,
        IAuditLogger,
      ],
    },

    // ReopenPeriodUseCase
    // Зависимости: ReportingPeriodRepository, PeriodTransitionRepository,
    //              PeriodSnapshotRepository, AccessControlService
    {
      provide: ReopenPeriodUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        transitionRepo: PrismaPeriodTransitionRepository,
        snapshotRepo: PrismaPeriodSnapshotRepository,
        accessControlService: AccessControlService,
      ) =>
        new ReopenPeriodUseCase(
          periodRepo,
          transitionRepo,
          snapshotRepo,
          accessControlService,
        ),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPeriodTransitionRepository,
        PrismaPeriodSnapshotRepository,
        AccessControlService,
      ],
    },
  ],
})
export class PeriodClosingAppModule {}
