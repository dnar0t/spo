/**
 * GetDashboardStatsUseCase
 *
 * Собирает агрегированные данные для дашборда:
 * - Количество активных периодов
 * - Количество активных сотрудников
 * - Краткая информация по периодам
 */
import { PrismaReportingPeriodRepository } from '../../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { PrismaUserRepository } from '../../../infrastructure/prisma/repositories/prisma-user.repository';

export class GetDashboardStatsUseCase {
  constructor(
    private readonly periodRepo: PrismaReportingPeriodRepository,
    private readonly personalReportRepo: PrismaPersonalReportRepository,
    private readonly userRepo: PrismaUserRepository,
  ) {}

  async execute(userId: string, userRoles: string[]) {
    // Get active periods (not closed)
    const periods = await this.periodRepo.findMany({
      state: { notIn: ['CLOSED', 'PERIOD_CLOSED'] },
    });

    // Get active users
    const users = await this.userRepo.findAll({ isActive: true });

    return {
      activePeriods: periods.length,
      totalEmployees: users.length,
      // TODO: add more stats later
      periods: periods.map((p) => ({
        id: p.id,
        month: p.month,
        year: p.year,
        state: p.state,
      })),
    };
  }
}
