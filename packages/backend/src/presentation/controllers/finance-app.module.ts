/**
 * FinanceAppModule (Presentation Layer)
 *
 * Модуль для финансовых операций.
 * Регистрирует use cases и контроллеры.
 */
import { Module } from '@nestjs/common';
import { FinanceModule } from '../../infrastructure/prisma/finance.module';
import { YouTrackModule } from '../../infrastructure/youtrack/youtrack.module';
import { FinanceController } from './finance.controller';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';

import { EffectiveRateCalculator } from '../../domain/services/effective-rate-calculator.service';
import { TaxCalculator } from '../../domain/services/tax-calculator.service';
import { CostCalculator } from '../../domain/services/cost-calculator.service';
import { SalaryCalculator } from '../../domain/services/salary-calculator.service';
import { FreezeFinancialsUseCase } from '../../application/finance/use-cases/freeze-financials.use-case';
import { GetPeriodGroupsUseCase } from '../../application/finance/use-cases/get-period-groups.use-case';
import { GetPeriodByProjectUseCase } from '../../application/finance/use-cases/get-period-by-project.use-case';
import { GetPeriodBySystemUseCase } from '../../application/finance/use-cases/get-period-by-system.use-case';
import { GetPeriodTotalsUseCase } from '../../application/finance/use-cases/get-period-totals.use-case';
import { AUDIT_LOGGER } from '../../application/auth/ports/audit-logger';
import {
  IYouTrackIssueRepository,
  YOUTRACK_ISSUE_REPOSITORY,
} from '../../application/finance/ports/youtrack-issue-repository';

@Module({
  imports: [FinanceModule, YouTrackModule],
  controllers: [FinanceController],
  providers: [
    // ─── Domain Services ───
    EffectiveRateCalculator,
    TaxCalculator,
    {
      provide: CostCalculator,
      useFactory: (effectiveRateCalculator: EffectiveRateCalculator) =>
        new CostCalculator(effectiveRateCalculator),
      inject: [EffectiveRateCalculator],
    },
    {
      provide: SalaryCalculator,
      useFactory: (
        effectiveRateCalculator: EffectiveRateCalculator,
        taxCalculator: TaxCalculator,
        costCalculator: CostCalculator,
      ) => new SalaryCalculator(effectiveRateCalculator, taxCalculator, costCalculator),
      inject: [EffectiveRateCalculator, TaxCalculator, CostCalculator],
    },
    // ─── Use Cases ───
    {
      provide: FreezeFinancialsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        auditLogger: IAuditLogger,
      ) => new FreezeFinancialsUseCase(periodRepo, personalReportRepo, auditLogger),
      inject: [PrismaReportingPeriodRepository, PrismaPersonalReportRepository, AUDIT_LOGGER],
    },
    // ─── Finance Read Use Cases ───
    {
      provide: GetPeriodGroupsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        issueRepo: IYouTrackIssueRepository,
      ) => new GetPeriodGroupsUseCase(periodRepo, personalReportRepo, issueRepo),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        YOUTRACK_ISSUE_REPOSITORY,
      ],
    },
    {
      provide: GetPeriodByProjectUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        issueRepo: IYouTrackIssueRepository,
      ) => new GetPeriodByProjectUseCase(periodRepo, personalReportRepo, issueRepo),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        YOUTRACK_ISSUE_REPOSITORY,
      ],
    },
    {
      provide: GetPeriodBySystemUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        issueRepo: IYouTrackIssueRepository,
      ) => new GetPeriodBySystemUseCase(periodRepo, personalReportRepo, issueRepo),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        YOUTRACK_ISSUE_REPOSITORY,
      ],
    },
    {
      provide: GetPeriodTotalsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
      ) => new GetPeriodTotalsUseCase(periodRepo, personalReportRepo),
      inject: [PrismaReportingPeriodRepository, PrismaPersonalReportRepository],
    },
  ],
  exports: [
    FreezeFinancialsUseCase,
    EffectiveRateCalculator,
    TaxCalculator,
    CostCalculator,
    SalaryCalculator,
  ],
})
export class FinanceAppModule {}
