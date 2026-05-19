import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { GetDashboardStatsUseCase } from '../../application/dashboard/use-cases/get-dashboard-stats.use-case';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [GetDashboardStatsUseCase],
})
export class DashboardAppModule {}

