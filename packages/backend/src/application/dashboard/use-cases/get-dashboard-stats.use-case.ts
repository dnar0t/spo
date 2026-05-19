import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface DashboardStatsDto {
  totalProjects: number;
  totalEmployees: number;
  totalHoursLogged: number;
  completionRate: number;
  activePeriod: {
    month: number;
    year: number;
    state: string;
  } | null;
  recentIssues: number;
  syncedIssues: number;
  teamsOverview: {
    totalUsers: number;
    syncedUsers: number;
    withRates: number;
  };
}

@Injectable()
export class GetDashboardStatsUseCase {
  private readonly logger = new Logger(GetDashboardStatsUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<DashboardStatsDto> {
    // Distinct project names from youtrack issues
    const projects = await this.prisma.youTrackIssue.findMany({
      where: { projectName: { not: null } },
      select: { projectName: true },
      distinct: ['projectName'],
    });

    const totalUsers = await this.prisma.user.count();
    const syncedUsers = await this.prisma.user.count({
      where: { youtrackUserId: { not: null } },
    });
    const withRates = await this.prisma.employeeRateHistory.count();

    const workItemsAgg = await this.prisma.workItem.aggregate({
      _sum: { durationMinutes: true },
    });
    const totalMinutes = workItemsAgg._sum.durationMinutes || 0;
    const totalHours = Math.round(totalMinutes / 60);

    const syncedIssues = await this.prisma.youTrackIssue.count();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentIssues = await this.prisma.youTrackIssue.count({
      where: { updatedAt: { gte: thirtyDaysAgo } },
    });

    const resolvedIssues = await this.prisma.youTrackIssue.count({
      where: { isResolved: true },
    });
    const completionRate = syncedIssues > 0
      ? Math.round((resolvedIssues / syncedIssues) * 100)
      : 0;

    let activePeriod = null;
    try {
      const period = await this.prisma.reportingPeriod.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        where: { state: { not: 'CLOSED' } },
        select: { month: true, year: true, state: true },
      });
      if (period) {
        activePeriod = {
          month: period.month,
          year: period.year,
          state: period.state,
        };
      } else {
        const latestPeriod = await this.prisma.reportingPeriod.findFirst({
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          select: { month: true, year: true, state: true },
        });
        if (latestPeriod) {
          activePeriod = {
            month: latestPeriod.month,
            year: latestPeriod.year,
            state: latestPeriod.state,
          };
        }
      }
    } catch {
      // ReportingPeriod table might not exist
    }

    return {
      totalProjects: projects.length,
      totalEmployees: totalUsers,
      totalHoursLogged: totalHours,
      completionRate,
      activePeriod,
      recentIssues,
      syncedIssues,
      teamsOverview: {
        totalUsers,
        syncedUsers,
        withRates,
      },
    };
  }
}

