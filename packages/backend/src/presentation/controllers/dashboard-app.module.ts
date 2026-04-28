/**
 * DashboardAppModule (Presentation Layer)
 *
 * Модуль для дашборда.
 * Регистрирует use case и контроллер.
 */
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { GetDashboardStatsUseCase } from '../../application/dashboard/use-cases/get-dashboard-stats.use-case';
import { PrismaReportingPeriodRepository } from '../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/prisma-user.repository';

@Module({
  controllers: [DashboardController],
  providers: [
    // ─── Use Cases ───
    {
      provide: GetDashboardStatsUseCase,
      useFactory: (
        periodRepo: PrismaReportingPeriodRepository,
        personalReportRepo: PrismaPersonalReportRepository,
        userRepo: PrismaUserRepository,
      ) => new GetDashboardStatsUseCase(periodRepo, personalReportRepo, userRepo),
      inject: [
        PrismaReportingPeriodRepository,
        PrismaPersonalReportRepository,
        PrismaUserRepository,
      ],
    },
  ],
})
export class DashboardAppModule {}
