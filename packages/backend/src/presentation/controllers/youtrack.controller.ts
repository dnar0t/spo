import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SyncEngine } from '../../infrastructure/youtrack/sync-engine';
import { YouTrackApiClient } from '../../infrastructure/youtrack/youtrack-api.client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * YouTrack Controller
 *
 * REST API endpoints для управления интеграцией с YouTrack:
 * - GET /api/youtrack/status — статус подключения
 * - POST /api/youtrack/sync — запуск полной синхронизации
 * - GET /api/youtrack/sync-runs — история синхронизаций
 * - GET /api/youtrack/sync-runs/:id — детали синхронизации
 * - GET /api/youtrack/issues — список синхронизированных задач
 * - POST /api/youtrack/test-connection — тест подключения к YouTrack
 */
@Controller('youtrack')
export class YouTrackController {
  private readonly logger = new Logger(YouTrackController.name);

  constructor(
    private readonly syncEngine: SyncEngine,
    private readonly apiClient: YouTrackApiClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Проверка статуса подключения к YouTrack
   */
  @Get('status')
  async getStatus(): Promise<{
    configured: boolean;
    baseUrl: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
  }> {
    const settings = await this.prisma.integrationSettings.findFirst();

    return {
      configured: this.apiClient.isConfigured,
      baseUrl: this.apiClient.isConfigured ? this.apiClient.getBaseUrl() : null,
      lastSyncAt: settings?.updated_at?.toISOString() || null,
      lastSyncStatus: settings?.isActive ? 'active' : 'inactive',
    };
  }

  /**
   * Тест подключения к YouTrack API
   */
  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> {
    try {
      if (!this.apiClient.isConfigured) {
        return {
          success: false,
          message:
            'YouTrack API client is not configured. Set YOUTRACK_BASE_URL and YOUTRACK_TOKEN.',
        };
      }

      // Пробуем получить информацию о текущем пользователе API
      const currentUser = await this.apiClient.get<{
        id: string;
        login: string;
        fullName: string;
      }>('/users/me', { fields: 'id,login,fullName' });

      // Пробуем получить список проектов (хотя бы первые)
      let projectCount = 0;
      try {
        const projects = await this.apiClient.get<unknown[]>('/admin/projects', {
          fields: 'id,name',
          $top: 1,
        });
        projectCount = Array.isArray(projects) ? projects.length : 0;
      } catch {
        // Проекты могут быть недоступны — не критично
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
      return {
        success: false,
        message: `Connection failed: ${message}`,
      };
    }
  }

  /**
   * Запуск полной синхронизации
   */
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async startSync(): Promise<{
    message: string;
    syncRunId?: string;
  }> {
    this.logger.log('Manual sync requested');

    try {
      const result = await this.syncEngine.runFullSync('MANUAL');
      return {
        message: `Sync completed: ${result.status}`,
        syncRunId: undefined, // ID будет в логах
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sync failed: ${message}`);
    }
  }

  /**
   * История синхронизаций
   */
  @Get('sync-runs')
  async getSyncRuns(
    @Body('limit') limit: number = 10,
    @Body('offset') offset: number = 0,
  ): Promise<{
    data: Array<{
      id: string;
      triggerType: string;
      status: string;
      totalIssues: number;
      createdCount: number;
      updatedCount: number;
      errorCount: number;
      startedAt: Date;
      completedAt: Date | null;
      duration: number | null;
    }>;
    total: number;
  }> {
    const [runs, total] = await Promise.all([
      this.prisma.syncRun.findMany({
        orderBy: { started_at: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        select: {
          id: true,
          trigger_type: true,
          status: true,
          total_issues: true,
          created_count: true,
          updated_count: true,
          error_count: true,
          started_at: true,
          completed_at: true,
          duration: true,
        },
      }),
      this.prisma.syncRun.count(),
    ]);

    return {
      data: runs.map((run) => ({
        id: run.id,
        triggerType: run.trigger_type,
        status: run.status,
        totalIssues: run.total_issues,
        createdCount: run.created_count,
        updatedCount: run.updated_count,
        errorCount: run.error_count,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        duration: run.duration,
      })),
      total,
    };
  }

  /**
   * Детали конкретной синхронизации с логами
   */
  @Get('sync-runs/:id')
  async getSyncRunDetail(@Param('id') id: string): Promise<{
    id: string;
    triggerType: string;
    status: string;
    totalIssues: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    errors: Record<string, unknown> | null;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    logs: Array<{
      id: string;
      level: string;
      message: string;
      entityType: string | null;
      createdAt: Date;
    }>;
  } | null> {
    const run = await this.prisma.syncRun.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            level: true,
            message: true,
            entity_type: true,
            created_at: true,
          },
        },
      },
    });

    if (!run) return null;

    return {
      id: run.id,
      triggerType: run.trigger_type,
      status: run.status,
      totalIssues: run.total_issues,
      createdCount: run.created_count,
      updatedCount: run.updated_count,
      errorCount: run.error_count,
      errors: run.errors as Record<string, unknown> | null,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      duration: run.duration,
      logs: run.logs.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        entityType: log.entity_type,
        createdAt: log.created_at,
      })),
    };
  }

  /**
   * Список синхронизированных задач с фильтрацией
   */
  @Get('issues')
  async getIssues(
    @Body('page') page: number = 1,
    @Body('limit') limit: number = 50,
    @Body('projectName') projectName?: string,
    @Body('systemName') systemName?: string,
    @Body('assigneeId') assigneeId?: string,
    @Body('isResolved') isResolved?: boolean,
    @Body('search') search?: string,
  ): Promise<{
    data: Array<{
      id: string;
      issueNumber: string;
      summary: string;
      projectName: string | null;
      systemName: string | null;
      typeName: string | null;
      stateName: string | null;
      isResolved: boolean;
      assigneeId: string | null;
      estimationMinutes: number | null;
      parentIssueId: string | null;
      lastSyncAt: Date | null;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Record<string, unknown> = {};

    if (projectName) where.project_name = projectName;
    if (systemName) where.system_name = systemName;
    if (assigneeId) where.assignee_id = assigneeId;
    if (isResolved !== undefined) where.is_resolved = isResolved;
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { issue_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (page - 1) * safeLimit;

    const [issues, total] = await Promise.all([
      this.prisma.youtrackIssue.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        take: safeLimit,
        skip,
        select: {
          id: true,
          issue_number: true,
          summary: true,
          project_name: true,
          system_name: true,
          type_name: true,
          state_name: true,
          is_resolved: true,
          assignee_id: true,
          estimation_minutes: true,
          parent_issue_id: true,
          last_sync_at: true,
          updated_at: true,
        },
      }),
      this.prisma.youtrackIssue.count({ where }),
    ]);

    return {
      data: issues.map((issue) => ({
        id: issue.id,
        issueNumber: issue.issue_number,
        summary: issue.summary,
        projectName: issue.project_name,
        systemName: issue.system_name,
        typeName: issue.type_name,
        stateName: issue.state_name,
        isResolved: issue.is_resolved,
        assigneeId: issue.assignee_id,
        estimationMinutes: issue.estimation_minutes,
        parentIssueId: issue.parent_issue_id,
        lastSyncAt: issue.last_sync_at,
        updatedAt: issue.updated_at,
      })),
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Статистика по интеграции
   */
  @Get('stats')
  async getStats(): Promise<{
    totalIssues: number;
    totalWorkItems: number;
    totalUsers: number;
    lastSyncRun: {
      status: string | null;
      startedAt: Date | null;
      completedAt: Date | null;
    } | null;
    issuesByProject: Record<string, number>;
    issuesByState: Record<string, number>;
  }> {
    const [totalIssues, totalWorkItems, totalUsers, lastSyncRun, projectAgg, stateAgg] =
      await Promise.all([
        this.prisma.youtrackIssue.count(),
        this.prisma.workItem.count(),
        this.prisma.user.count({ where: { youtrack_user_id: { not: null } } }),
        this.prisma.syncRun.findFirst({
          orderBy: { started_at: 'desc' },
          select: { status: true, started_at: true, completed_at: true },
        }),
        this.prisma.youtrackIssue.groupBy({
          by: ['project_name'],
          _count: { id: true },
          where: { project_name: { not: null } },
        }),
        this.prisma.youtrackIssue.groupBy({
          by: ['state_name'],
          _count: { id: true },
          where: { state_name: { not: null } },
        }),
      ]);

    return {
      totalIssues,
      totalWorkItems,
      totalUsers,
      lastSyncRun: lastSyncRun
        ? {
            status: lastSyncRun.status,
            startedAt: lastSyncRun.started_at,
            completedAt: lastSyncRun.completed_at,
          }
        : null,
      issuesByProject: Object.fromEntries(
        projectAgg.map((p) => [p.project_name!, p._count.id]),
      ),
      issuesByState: Object.fromEntries(
        stateAgg.map((s) => [s.state_name!, s._count.id]),
      ),
    };
  }
}
