/**
 * DashboardController
 *
 * REST API для дашборда.
 * Предоставляет агрегированную статистику по системе.
 */
import { Controller, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { GetDashboardStatsUseCase } from '../../application/dashboard/use-cases/get-dashboard-stats.use-case';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly getDashboardStatsUseCase: GetDashboardStatsUseCase) {}

  /**
   * GET /api/dashboard/stats
   * Возвращает агрегированные данные для дашборда:
   * - количество активных периодов
   * - количество сотрудников
   * - список периодов с их статусами
   */
  @Get('stats')
  async getStats(@Req() req: RequestWithUser) {
    return await this.getDashboardStatsUseCase.execute(req.user.id, req.user.roles ?? []);
  }
}
