import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SyncEngine } from '../sync-engine';
import { YouTrackApiClient } from '../youtrack-api.client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IYouTrackRepository,
  YouTrackStatusDto,
  YouTrackTestConnectionResultDto,
  StartSyncResultDto,
  SyncRunsListDto,
  SyncRunFilter,
  SyncRunDetailDto,
  StageDetails,
  YouTrackIssuesListDto,
  IssueFilter,
  YouTrackStatsDto,
} from '../../../application/integration/ports/youtrack-repository';

@Injectable()
export class YouTrackRepositoryImpl implements IYouTrackRepository {
  private readonly logger = new Logger(YouTrackRepositoryImpl.name);

  constructor(
    private readonly syncEngine: SyncEngine,
    private readonly apiClient: YouTrackApiClient,
    private readonly prisma: PrismaService,
  ) {}

  async getStatus(): Promise<YouTrackStatusDto> {
    await this.apiClient.reloadConfig();
    const settings = await this.prisma.integrationSettings.findFirst();
    return {
      configured: this.apiClient.isConfigured,
      baseUrl: this.apiClient.isConfigured ? this.apiClient.getBaseUrl() : null,
      lastSyncAt: settings?.updatedAt?.toISOString() || null,
      lastSyncStatus: settings?.isActive ? 'active' : 'inactive',
    };
  }

  async testConnection(): Promise<YouTrackTestConnectionResultDto> {
    await this.apiClient.reloadConfig();
    if (!this.apiClient.isConfigured) {
      return { success: false, message: 'YouTrack API client is not configured.' };
    }
    try {
      const currentUser = await this.apiClient.get<{
        id: string;
        login: string;
        fullName: string;
      }>('/users/me', { fields: 'id,login,fullName' });
      let projectCount = 0;
      try {
        const projects = await this.apiClient.get<unknown[]>('/admin/projects', {
          fields: 'id,name',
          $top: 1,
        });
        projectCount = Array.isArray(projects) ? projects.length : 0;
      } catch {
        /* not critical */
      }
      return {
        success: true,
        message: `Connected to YouTrack as ${currentUser.login} (${currentUser.fullName})`,
        details: {
          userId: currentUser.id,
          login: currentUser.login,
          fullName: currentUser.fullName,
          hasProjectAccess: projectCount > 0,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`YouTrack connection test failed: ${message}`);
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  async startSync(periodId?: number): Promise<StartSyncResultDto> {
    this.logger.log('Manual sync requested via repository');
    await this.apiClient.reloadConfig();

    const syncRunId = uuidv4();
    await this.prisma.syncRun.create({
      data: {
        id: syncRunId,
        triggerType: 'MANUAL',
        status: 'RUNNING',
        currentStage: 'starting',
        startedAt: new Date(),
        totalIssues: 0,
        createdCount: 0,
        updatedCount: 0,
        errorCount: 0,
        extensions: {
          stageDetails: {
            users: { created: 0, updated: 0, errors: 0 },
            projects: { created: 0, updated: 0, errors: 0 },
            issues: { created: 0, updated: 0, errors: 0 },
            workItems: { created: 0, updated: 0, errors: 0 },
          },
        },
      },
    });

    this.logger.log(`Starting background sync ${syncRunId}`);
    this.syncEngine.runFullSync('MANUAL', syncRunId).catch((err: any) => {
      this.logger.error(`Background sync ${syncRunId} failed: ${err?.message || err}`);
    });

    return { message: 'Sync started', syncRunId };
  }

  async getSyncRuns(filter: SyncRunFilter): Promise<SyncRunsListDto> {
    const { limit, offset } = filter;
    const [runs, total] = await Promise.all([
      this.prisma.syncRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        select: {
          id: true,
          triggerType: true,
          status: true,
          totalIssues: true,
          createdCount: true,
          updatedCount: true,
          errorCount: true,
          startedAt: true,
          completedAt: true,
          duration: true,
        },
      }),
      this.prisma.syncRun.count(),
    ]);
    return {
      data: runs.map((run) => ({
        id: run.id,
        triggerType: run.triggerType,
        status: run.status,
        totalIssues: run.totalIssues,
        createdCount: run.createdCount,
        updatedCount: run.updatedCount,
        errorCount: run.errorCount,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        duration: run.duration,
      })),
      total,
    };
  }

  async getSyncRunDetail(id: string): Promise<SyncRunDetailDto | null> {
    const run = await this.prisma.syncRun.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, level: true, message: true, entityType: true, createdAt: true },
        },
      },
    });
    if (!run) return null;
    const extensions = run.extensions as Record<string, unknown> | null;
    const stageDetails = (extensions?.stageDetails as StageDetails | null) ?? null;
    return {
      id: run.id,
      triggerType: run.triggerType,
      status: run.status,
      totalIssues: run.totalIssues,
      createdCount: run.createdCount,
      updatedCount: run.updatedCount,
      errorCount: run.errorCount,
      errors: run.errors as Record<string, unknown> | null,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      duration: run.duration,
      currentStage: run.currentStage ?? null,
      stageDetails,
      logs: run.logs.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        entityType: log.entityType,
        createdAt: log.createdAt,
      })),
    };
  }

  async getIssues(filter: IssueFilter): Promise<YouTrackIssuesListDto> {
    const { page, limit, projectName, systemName, assigneeId, isResolved, search } = filter;
    const where: Record<string, unknown> = {};
    if (projectName) where.projectName = projectName;
    if (systemName) where.systemName = systemName;
    if (assigneeId) where.assigneeId = assigneeId;
    if (isResolved !== undefined) where.isResolved = isResolved;
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { issueNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (page - 1) * safeLimit;
    const [issues, total] = await Promise.all([
      this.prisma.youtrackIssue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: safeLimit,
        skip,
        select: {
          id: true,
          issueNumber: true,
          summary: true,
          projectName: true,
          systemName: true,
          typeName: true,
          stateName: true,
          isResolved: true,
          assigneeId: true,
          estimationMinutes: true,
          parentIssueId: true,
          lastSyncAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.youtrackIssue.count({ where }),
    ]);
    return {
      data: issues.map((issue) => ({
        id: issue.id,
        issueNumber: issue.issueNumber,
        summary: issue.summary,
        projectName: issue.projectName,
        systemName: issue.systemName,
        typeName: issue.typeName,
        stateName: issue.stateName,
        isResolved: issue.isResolved,
        assigneeId: issue.assigneeId,
        estimationMinutes: issue.estimationMinutes,
        parentIssueId: issue.parentIssueId,
        lastSyncAt: issue.lastSyncAt,
        updatedAt: issue.updatedAt,
      })),
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getStats(): Promise<YouTrackStatsDto> {
    const [totalIssues, totalWorkItems, totalUsers, lastSyncRun, projectAgg, stateAgg] =
      await Promise.all([
        this.prisma.youtrackIssue.count(),
        this.prisma.workItem.count(),
        this.prisma.user.count({ where: { youtrackUserId: { not: null } } }),
        this.prisma.syncRun.findFirst({
          orderBy: { startedAt: 'desc' },
          select: { status: true, startedAt: true, completedAt: true },
        }),
        this.prisma.youtrackIssue.groupBy({
          by: ['projectName'],
          _count: { id: true },
          where: { projectName: { not: null } },
        }),
        this.prisma.youtrackIssue.groupBy({
          by: ['stateName'],
          _count: { id: true },
          where: { stateName: { not: null } },
        }),
      ]);
    return {
      totalIssues,
      totalWorkItems,
      totalUsers,
      lastSyncRun: lastSyncRun
        ? {
            status: lastSyncRun.status,
            startedAt: lastSyncRun.startedAt,
            completedAt: lastSyncRun.completedAt,
          }
        : null,
      issuesByProject: Object.fromEntries(projectAgg.map((p) => [p.projectName!, p._count.id])),
      issuesByState: Object.fromEntries(stateAgg.map((s) => [s.stateName!, s._count.id])),
    };
  }
}
