/**
 * FinanceAppModule (Presentation Layer)
 *
 * Модуль для финансовых операций.
 * Регистрирует use cases и контроллеры.
 */
import { Module } from '@nestjs/common';
import { FinanceModule } from '../../infrastructure/prisma/finance.module';
import { FinanceController } from './finance.controller';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { EffectiveRateCalculator } from '../../domain/services/effective-rate-calculator.service';
import { TaxCalculator } from '../../domain/services/tax-calculator.service';
import { CostCalculator } from '../../domain/services/cost-calculator.service';
import { SalaryCalculator } from '../../domain/services/salary-calculator.service';
import { FreezeFinancialsUseCase } from '../../application/finance/use-cases/freeze-financials.use-case';
import { IAuditLogger } from '../../application/auth/ports/audit-logger';

@Module({
  imports: [FinanceModule],
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
      inject: [PrismaReportingPeriodRepository, PrismaPersonalReportRepository, IAuditLogger],
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
