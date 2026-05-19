import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { GetDashboardStatsUseCase, DashboardStatsDto } from '../../application/dashboard/use-cases/get-dashboard-stats.use-case';

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'manager', 'viewer')
  @Get('stats')
  async getStats(): Promise<DashboardStatsDto> {
    this.logger.log('Fetching dashboard stats');
    return this.getDashboardStatsUseCase.execute();
  }
}

