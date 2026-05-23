import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YouTrackApiClient } from './youtrack-api.client';
import { YouTrackMapper } from './youtrack-mapper';
import {
  YouTrackUser,
  YouTrackIssue,
  YouTrackWorkItem,
  YouTrackProject,
  YouTrackFullSyncResult,
  YouTrackSyncResult,
  YouTrackSyncConfig,
} from './youtrack.types';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync Engine
 *
 * Ядро интеграции с YouTrack. Управляет процессом синхронизации:
 * 1. Пользователи (Hub)
 * 2. Проекты
 * 3. Задачи (Issues) с иерархией
 * 4. Work items (трудозатраты)
 *
 * Каждый этап логируется в SyncRun / SyncLogEntry.
 */
@Injectable()
export class SyncEngine {
  private readonly logger = new Logger(SyncEngine.name);
  private readonly defaultFields =
    'id,idReadable,summary,description,created,updated,resolved,project(id,name,shortName),reporter(id,login,fullName,email),assignee(id,login,fullName,email),customFields(id,name,value(id,name,localizedName)),parent(id,idReadable),subtasks(id,idReadable)';

  constructor(
    private readonly configService: ConfigService,
    private readonly apiClient: YouTrackApiClient,
    private readonly mapper: YouTrackMapper,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Запустить полную синхронизацию
   */
  async runFullSync(
    triggerType: 'MANUAL' | 'SCHEDULED' = 'MANUAL',
    existingSyncRunId?: string,
  ): Promise<YouTrackFullSyncResult> {
    if (!this.apiClient.isConfigured) {
      throw new Error(
        'YouTrack API client is not configured. Set YOUTRACK_BASE_URL and YOUTRACK_TOKEN.',
      );
    }

    const startedAt = new Date();
    this.logger.log(`🚀 Starting full sync (${triggerType}) at ${startedAt.toISOString()}`);

    // Создаём запись о запуске синхронизации (если не передан существующий ID)
    const syncRun = existingSyncRunId
      ? { id: existingSyncRunId }
      : await this.prisma.syncRun.create({
          data: {
            id: uuidv4(),
            triggerType,
            status: 'RUNNING',
            currentStage: 'starting',
            startedAt,
          },
        });

    // Вспомогательная функция для обновления прогресса этапа
    const updateStageProgress = async (
      stage: string,
      processed: number,
      changed: number,
      stageCreated: number,
      stageUpdated: number,
      stageErrors: number,
    ) => {
      // Читаем текущие extensions чтобы не потерять данные предыдущих этапов
      const currentRun = await this.prisma.syncRun.findUnique({
        where: { id: syncRun.id },
        select: { extensions: true },
      });
      const currentExtensions = (currentRun?.extensions as Record<string, unknown> | null) ?? {};
      const currentStageDetails = (currentExtensions?.stageDetails as Record<
        string,
        { created: number; updated: number; errors: number }
      > | null) ?? {
        users: null,
        projects: null,
        issues: null,
        workItems: null,
      };

      const newStageDetails = {
        ...currentStageDetails,
        [stage]: { created: stageCreated, updated: stageUpdated, errors: stageErrors },
      };

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          currentStage: stage,
          createdCount: processed,
          updatedCount: changed,
          extensions: {
            ...currentExtensions,
            stageDetails: newStageDetails,
          },
        },
      });
    };

    try {
      // Этап 1: Синхронизация пользователей
      await this.updateStageProgressWithMerge(syncRun.id, 'users', 0, 0, 0, 0);
      const usersResult = await this.syncUsers(syncRun.id);
      await this.logSyncInfo(
        syncRun.id,
        'Users synced',
        `Created: ${usersResult.created}, Updated: ${usersResult.updated}`,
      );
      await updateStageProgress(
        'users',
        usersResult.created + usersResult.updated,
        usersResult.updated,
        usersResult.created,
        usersResult.updated,
        usersResult.errors.length,
      );

      // Этап 2: Синхронизация проектов
      await this.updateStageProgressWithMerge(syncRun.id, 'projects', 0, 0, 0, 0);
      const projectsResult = await this.syncProjects(syncRun.id);
      await this.logSyncInfo(
        syncRun.id,
        'Projects synced',
        `Created: ${projectsResult.created}, Updated: ${projectsResult.updated}`,
      );
      await updateStageProgress(
        'projects',
        usersResult.created + usersResult.updated + projectsResult.created + projectsResult.updated,
        usersResult.updated + projectsResult.updated,
        projectsResult.created,
        projectsResult.updated,
        projectsResult.errors.length,
      );

      // Этап 3: Синхронизация задач
      await this.updateStageProgressWithMerge(syncRun.id, 'issues', 0, 0, 0, 0);
      const issuesResult = await this.syncIssues(syncRun.id);
      await this.logSyncInfo(
        syncRun.id,
        'Issues synced',
        `Created: ${issuesResult.created}, Updated: ${issuesResult.updated}`,
      );
      await updateStageProgress(
        'issues',
        usersResult.created +
          usersResult.updated +
          projectsResult.created +
          projectsResult.updated +
          issuesResult.created +
          issuesResult.updated,
        usersResult.updated + projectsResult.updated + issuesResult.updated,
        issuesResult.created,
        issuesResult.updated,
        issuesResult.errors.length,
      );

      // Этап 4: Синхронизация work items
      await this.updateStageProgressWithMerge(syncRun.id, 'workItems', 0, 0, 0, 0);
      const workItemsResult = await this.syncWorkItems(syncRun.id);
      await this.logSyncInfo(
        syncRun.id,
        'Work items synced',
        `Created: ${workItemsResult.created}, Updated: ${workItemsResult.updated}`,
      );
      await updateStageProgress(
        'workItems',
        usersResult.created +
          usersResult.updated +
          projectsResult.created +
          projectsResult.updated +
          issuesResult.created +
          issuesResult.updated +
          workItemsResult.created +
          workItemsResult.updated,
        usersResult.updated +
          projectsResult.updated +
          issuesResult.updated +
          workItemsResult.updated,
        workItemsResult.created,
        workItemsResult.updated,
        workItemsResult.errors.length,
      );

      const completedAt = new Date();
      const duration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

      const totalErrors =
        usersResult.errors.length +
        projectsResult.errors.length +
        issuesResult.errors.length +
        workItemsResult.errors.length;

      const status = totalErrors > 0 ? 'PARTIAL' : 'SUCCESS';

      // Сохраняем ошибки этапов в SyncLogEntry
      const logErrorsForStage = async (stageName: string, errors: Array<{ entityId?: string; message: string }>) => {
        for (const err of errors) {
          await this.logEntityError(
            syncRun.id,
            stageName,
            err.entityId || 'unknown',
            err.message,
          );
        }
      };
      await logErrorsForStage('users', usersResult.errors);
      await logErrorsForStage('projects', projectsResult.errors);
      await logErrorsForStage('issues', issuesResult.errors);
      await logErrorsForStage('workItems', workItemsResult.errors);

      // Очищаем логи предыдущих синхронизаций
      await this.cleanOldSyncLogs(syncRun.id);

      // Финальное обновление записи о синхронизации
      const totalUsersCreatedAndUpdated = usersResult.created + usersResult.updated;
      const totalProjectsCreatedAndUpdated = projectsResult.created + projectsResult.updated;
      const totalIssuesCreatedAndUpdated = issuesResult.created + issuesResult.updated;
      const totalWorkItemsCreatedAndUpdated = workItemsResult.created + workItemsResult.updated;

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status,
          currentStage: null,
          totalIssues: totalIssuesCreatedAndUpdated,
          createdCount:
            usersResult.created +
            projectsResult.created +
            issuesResult.created +
            workItemsResult.created,
          updatedCount:
            usersResult.updated +
            projectsResult.updated +
            issuesResult.updated +
            workItemsResult.updated,
          errorCount: totalErrors,
          errors:
            totalErrors > 0
              ? {
                  users: usersResult.errors,
                  projects: projectsResult.errors,
                  issues: issuesResult.errors,
                  workItems: workItemsResult.errors,
                }
              : null,
          extensions: {
            stageDetails: {
              users: {
                created: usersResult.created,
                updated: usersResult.updated,
                errors: usersResult.errors.length,
              },
              projects: {
                created: projectsResult.created,
                updated: projectsResult.updated,
                errors: projectsResult.errors.length,
              },
              issues: {
                created: issuesResult.created,
                updated: issuesResult.updated,
                errors: issuesResult.errors.length,
              },
              workItems: {
                created: workItemsResult.created,
                updated: workItemsResult.updated,
                errors: workItemsResult.errors.length,
              },
            },
          },
          completedAt,
          duration,
        },
      });

      const result: YouTrackFullSyncResult = {
        users: usersResult,
        projects: projectsResult,
        issues: issuesResult,
        workItems: workItemsResult,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        duration,
        status,
        syncRunId: syncRun.id,
      };

      this.logger.log(
        `✅ Sync completed: ${status} in ${duration}s. ` +
          `Users: ${usersResult.created}+${usersResult.updated}, ` +
          `Issues: ${issuesResult.created}+${issuesResult.updated}, ` +
          `WorkItems: ${workItemsResult.created}+${workItemsResult.updated}`,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          errors: { fatal: errorMessage },
          completedAt: new Date(),
          duration: Math.round((Date.now() - startedAt.getTime()) / 1000),
        },
      });

      await this.prisma.syncLogEntry.create({
        data: {
          id: uuidv4(),
          syncRunId: syncRun.id,
          level: 'ERROR',
          message: `Fatal sync error: ${errorMessage}`,
          entityType: 'SYNC',
          details: { error: errorMessage, stack: error instanceof Error ? error.stack : undefined },
        },
      });

      this.logger.error(
        `❌ Sync failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  /**
   * Синхронизация пользователей из YouTrack/Hub
   */
  private async syncUsers(syncRunId: string): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const users = await this.apiClient.get<YouTrackUser[]>(
        '/users',
        { fields: 'id,login,fullName,email,banned,guest' },
        false,
      );

      this.logger.log(`Fetched ${users.length} users from YouTrack`);

      let lastProgressUpdate = Date.now();
      let processedCount = 0;

      for (const ytUser of users) {
        try {
          // Пропускаем гостевых и забаненных пользователей
          if (ytUser.guest || ytUser.banned) continue;

          const userData = this.mapper.mapUser(ytUser);

          // Проверяем, существует ли пользователь по youtrackUserId
          const existingUser = await this.prisma.user.findFirst({
            where: { youtrackUserId: ytUser.id },
          });

          if (existingUser) {
            // Обновляем существующего пользователя
            await this.prisma.user.update({
              where: { id: existingUser.id },
              data: {
                email: userData.email ?? existingUser.email,
                fullName: userData.fullName ?? existingUser.fullName,
                youtrackLogin: userData.youtrackLogin,
                youtrackUserId: userData.youtrackUserId,
                isActive: true,
              },
            });
            result.updated++;
          } else {
            // Проверяем, нет ли пользователя с таким же login
            const existingByLogin = await this.prisma.user.findUnique({
              where: { login: userData.login },
            });

            if (existingByLogin) {
              // Обновляем существующего (добавляем youtrack данные)
              await this.prisma.user.update({
                where: { id: existingByLogin.id },
                data: {
                  email: userData.email ?? existingByLogin.email,
                  fullName: userData.fullName ?? existingByLogin.fullName,
                  youtrackLogin: userData.youtrackLogin,
                  youtrackUserId: userData.youtrackUserId,
                  isActive: true,
                },
              });
              result.updated++;
            } else {
              // Создаём нового пользователя
              await this.prisma.user.create({
                data: {
                  id: uuidv4(),
                  login: userData.login,
                  email: userData.email,
                  fullName: userData.fullName,
                  youtrackLogin: userData.youtrackLogin,
                  youtrackUserId: userData.youtrackUserId,
                  isActive: true,
                },
              });
              result.created++;
            }
          }
          processedCount++;
        } catch (error) {
          result.errors.push({
            entityId: ytUser.id,
            message: error instanceof Error ? error.message : 'Failed to sync user',
          });
          processedCount++;
        }

        // Обновляем прогресс каждые 1.5 секунды
        const now = Date.now();
        if (now - lastProgressUpdate > 1500 && users.length > 0) {
          lastProgressUpdate = now;
          await this.updateStageProgressWithMerge(
            syncRunId,
            'users',
            result.created,
            result.updated,
            result.errors.length,
            users.length,
          );
        }
      }
    } catch (error) {
      result.errors.push({
        message: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Синхронизация проектов
   */
  private async syncProjects(syncRunId: string): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // YouTrack API не имеет dedicated endpoint для проектов в /api,
      // но мы можем получить их через issues или через админский API.
      // Пока сохраняем только названия проектов из задач.
      this.logger.log('Projects will be extracted from issues during sync');
    } catch (error) {
      result.errors.push({
        message: `Failed to sync projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Синхронизация задач с иерархией
   */
  private async syncIssues(syncRunId: string): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const searchQuery = this.configService.get<string>('YOUTRACK_SEARCH_QUERY', '');
      const params: Record<string, string | number | boolean | undefined> = {
        fields: this.defaultFields,
      };

      if (searchQuery) {
        params.query = searchQuery;
      }

      const issues = await this.apiClient.get<YouTrackIssue[]>(
        '/issues',
        params,
        true, // paginated
      );

      this.logger.log(`Fetched ${issues.length} issues from YouTrack`);

      // Первый проход: сохраняем все задачи (без parent связей)
      const issueMap = new Map<string, string>(); // youtrackId → ourId
      let lastProgressUpdate = Date.now();

      for (const ytIssue of issues) {
        try {
          const issueData = this.mapper.mapIssue(ytIssue);

          // Проверяем существование
          const existingIssue = await this.prisma.youtrackIssue.findUnique({
            where: { youtrackId: ytIssue.id },
          });

          let assigneeId: string | null = null;
          if (ytIssue.assignee) {
            const assignee = await this.prisma.user.findFirst({
              where: { youtrackUserId: ytIssue.assignee.id },
            });
            assigneeId = assignee?.id || null;
          }

          if (existingIssue) {
            await this.prisma.youtrackIssue.update({
              where: { id: existingIssue.id },
              data: {
                summary: issueData.summary,
                description: issueData.description,
                projectName: issueData.projectName,
                systemName: issueData.systemName,
                sprintName: issueData.sprintName,
                typeName: issueData.typeName,
                priorityName: issueData.priorityName,
                stateName: issueData.stateName,
                isResolved: issueData.isResolved,
                assigneeId: assigneeId,
                estimationMinutes: issueData.estimationMinutes,
                parentYtId: issueData.parentYtId,
                lastSyncAt: new Date(),
                updatedAt: new Date(),
              },
            });
            issueMap.set(existingIssue.youtrackId, existingIssue.id);
            result.updated++;
          } else {
            const newIssue = await this.prisma.youtrackIssue.create({
              data: {
                id: uuidv4(),
                youtrackId: issueData.youtrackId,
                issueNumber: issueData.issueNumber,
                summary: issueData.summary,
                description: issueData.description,
                projectName: issueData.projectName,
                systemName: issueData.systemName,
                sprintName: issueData.sprintName,
                typeName: issueData.typeName,
                priorityName: issueData.priorityName,
                stateName: issueData.stateName,
                isResolved: issueData.isResolved,
                assigneeId: assigneeId,
                estimationMinutes: issueData.estimationMinutes,
                parentYtId: issueData.parentYtId,
                lastSyncAt: new Date(),
              },
            });
            issueMap.set(newIssue.youtrackId, newIssue.id);
            result.created++;
          }
        } catch (error) {
          result.errors.push({
            entityId: ytIssue.id,
            message: error instanceof Error ? error.message : 'Failed to sync issue',
          });
        }

        // Обновляем прогресс каждые 1.5 секунды
        const now = Date.now();
        if (now - lastProgressUpdate > 1500 && issues.length > 0) {
          lastProgressUpdate = now;
          await this.updateStageProgressWithMerge(
            syncRunId,
            'issues',
            result.created,
            result.updated,
            result.errors.length,
            issues.length,
          );
        }
      }

      // Второй проход: устанавливаем parent-child связи
      for (const ytIssue of issues) {
        if (!ytIssue.parent) continue;

        const childId = issueMap.get(ytIssue.id);
        const parentId = issueMap.get(ytIssue.parent.id);

        if (childId && parentId) {
          await this.prisma.youtrackIssue.update({
            where: { id: childId },
            data: {
              parentIssueId: parentId,
            },
          });
        }
      }
    } catch (error) {
      result.errors.push({
        message: `Failed to fetch issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Синхронизация work items по задачам
   */
  private async syncWorkItems(syncRunId: string): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      // Получаем все задачи, для которых нужно загрузить work items
      const issues = await this.prisma.youtrackIssue.findMany({
        select: { id: true, youtrackId: true, issueNumber: true },
      });

      this.logger.log(`Loading work items for ${issues.length} issues`);

      const workItemFields =
        'id,author(id,login,fullName),text,textPreview,type(id,name),duration(presentation,minutes),date,created,updated,issue(id,idReadable)';

      let lastProgressUpdate = Date.now();
      let issueIndex = 0;
      const CONCURRENCY_LIMIT = 10;

      // Функция обработки work items для одной задачи
      const processIssueWorkItems = async (issue: {
        id: string;
        youtrackId: string;
        issueNumber: string;
      }): Promise<void> => {
        let workItems: YouTrackWorkItem[] = [];
        try {
          workItems = await this.apiClient.get<YouTrackWorkItem[]>(
            `/issues/${issue.youtrackId}/timeTracking/workItems`,
            { fields: workItemFields },
            true, // paginated
          );
        } catch (error) {
          // 404 = нет work items для этой задачи, не считаем ошибкой
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('404') || msg.includes('Not Found') || msg.includes('not found')) {
            this.logger.warn(
              `No work items for issue ${issue.issueNumber} (${issue.youtrackId}): ${msg}`,
            );
            return;
          }
          result.errors.push({
            entityId: issue.issueNumber,
            message: `Failed to fetch work items for ${issue.issueNumber}: ${msg}`,
          });
          return;
        }

        if (!workItems || workItems.length === 0) return;

        for (const ytWorkItem of workItems) {
          try {
            const workItemData = this.mapper.mapWorkItem(ytWorkItem, issue.id);

            // Находим автора по youtrackLogin
            let authorId: string | null = null;
            if (workItemData.authorLogin) {
              const author = await this.prisma.user.findFirst({
                where: { youtrackLogin: workItemData.authorLogin },
              });
              authorId = author?.id || null;
            }

            // Проверяем существование work item
            const existingWorkItem = await this.prisma.workItem.findFirst({
              where: {
                youtrackWorkItemId: ytWorkItem.id,
                issueId: issue.id,
              },
            });

            if (existingWorkItem) {
              await this.prisma.workItem.update({
                where: { id: existingWorkItem.id },
                data: {
                  authorId: authorId,
                  durationMinutes: workItemData.durationMinutes,
                  description: workItemData.description,
                  workDate: workItemData.workDate,
                  workTypeName: workItemData.workTypeName,
                },
              });
              result.updated++;
            } else {
              await this.prisma.workItem.create({
                data: {
                  id: uuidv4(),
                  issueId: issue.id,
                  youtrackWorkItemId: ytWorkItem.id,
                  authorId: authorId,
                  durationMinutes: workItemData.durationMinutes,
                  description: workItemData.description,
                  workDate: workItemData.workDate,
                  workTypeName: workItemData.workTypeName,
                },
              });
              result.created++;
            }
          } catch (error) {
            // Некритичная ошибка при сохранении work item - логируем но не считаем ошибкой синхронизации
            this.logger.warn(
              `Failed to sync work item ${ytWorkItem.id} for issue ${issue.issueNumber}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            );
          }
        }
      };

      // Разбиваем issues на батчи и обрабатываем параллельно
      for (let start = 0; start < issues.length; start += CONCURRENCY_LIMIT) {
        const batch = issues.slice(start, start + CONCURRENCY_LIMIT);
        await Promise.all(batch.map(processIssueWorkItems));

        issueIndex += batch.length;

        // Обновляем прогресс после каждого батча
        const now = Date.now();
        if (now - lastProgressUpdate > 1000 || start + CONCURRENCY_LIMIT >= issues.length) {
          lastProgressUpdate = now;
          await this.updateStageProgressWithMerge(
            syncRunId,
            'workItems',
            result.created,
            result.updated,
            result.errors.length,
            issues.length,
          );
          this.logger.log(
            `Work items progress: ${issueIndex}/${issues.length} issues, ` +
              `${result.created} created, ${result.updated} updated, ${result.errors.length} errors`,
          );
        }
      }
    } catch (error) {
      result.errors.push({
        message: `Failed to sync work items: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Синхронизация work items по периоду (для загрузки факта)
   */
  async syncWorkItemsByPeriod(
    periodId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const issues = await this.prisma.youtrackIssue.findMany({
        select: { id: true, youtrackId: true, issueNumber: true },
      });

      const workItemFields =
        'id,author(id,login,fullName),text,textPreview,type(id,name),duration(presentation,minutes),date,created,updated,issue(id,idReadable)';

      for (const issue of issues) {
        try {
          const workItems = await this.apiClient.get<YouTrackWorkItem[]>(
            `/issues/${issue.youtrackId}/timeTracking/workItems`,
            { fields: workItemFields },
            true,
          );

          for (const ytWorkItem of workItems) {
            // Фильтруем work items по дате (если есть)
            if (ytWorkItem.date) {
              const workDate = new Date(ytWorkItem.date);
              if (workDate < startDate || workDate > endDate) {
                continue;
              }
            }

            try {
              const workItemData = this.mapper.mapWorkItem(ytWorkItem, issue.id);

              let authorId: string | null = null;
              if (workItemData.authorLogin) {
                const author = await this.prisma.user.findFirst({
                  where: { youtrackLogin: workItemData.authorLogin },
                });
                authorId = author?.id || null;
              }

              const existingWorkItem = await this.prisma.workItem.findFirst({
                where: {
                  youtrackWorkItemId: ytWorkItem.id,
                  issueId: issue.id,
                },
              });

              if (existingWorkItem) {
                await this.prisma.workItem.update({
                  where: { id: existingWorkItem.id },
                  data: {
                    authorId: authorId,
                    durationMinutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    workDate: workItemData.workDate,
                    workTypeName: workItemData.workTypeName,
                    periodId: periodId,
                  },
                });
                result.updated++;
              } else {
                await this.prisma.workItem.create({
                  data: {
                    id: uuidv4(),
                    issueId: issue.id,
                    youtrackWorkItemId: ytWorkItem.id,
                    authorId: authorId,
                    durationMinutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    workDate: workItemData.workDate,
                    workTypeName: workItemData.workTypeName,
                    periodId: periodId,
                  },
                });
                result.created++;
              }
            } catch (error) {
              result.errors.push({
                entityId: ytWorkItem.id,
                message: error instanceof Error ? error.message : 'Failed to sync work item',
              });
            }
          }
        } catch (error) {
          result.errors.push({
            entityId: issue.issueNumber,
            message: error instanceof Error ? error.message : 'Failed to fetch work items',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        message: `Failed to sync work items by period: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Обновить текущий этап синхронизации для отслеживания прогресса
   */
  private async updateStage(syncRunId: string, stage: string): Promise<void> {
    await this.prisma.syncRun.update({
      where: { id: syncRunId },
      data: { currentStage: stage },
    });
  }

  /**
   * Логирование информационных сообщений в SyncLogEntry
   */
  private async logSyncInfo(syncRunId: string, message: string, details?: string): Promise<void> {
    await this.prisma.syncLogEntry.create({
      data: {
        id: uuidv4(),
        syncRunId,
        level: 'INFO',
        message,
        details: details ? { description: details } : null,
      },
    });
  }

  /**
   * Логирование предупреждений в SyncLogEntry
   */
  private async logEntityWarning(
    syncRunId: string,
    entityType: string,
    entityId: string,
    message: string,
  ): Promise<void> {
    await this.prisma.syncLogEntry.create({
      data: {
        id: uuidv4(),
        syncRunId,
        level: 'WARN',
        message,
        entityId,
        entityType,
        details: null,
      },
    }).catch(() => {});
  }

  /**
   * Логирование ошибок в SyncLogEntry
   */
  private async logEntityError(
    syncRunId: string,
    entityType: string,
    entityId: string,
    message: string,
    error?: string,
  ): Promise<void> {
    await this.prisma.syncLogEntry.create({
      data: {
        id: uuidv4(),
        syncRunId,
        level: 'ERROR',
        message,
        entityId,
        entityType,
        details: error ? { error } : null,
      },
    }).catch(() => {});
  }

  /**
   * Очистить логи предыдущих синхронизаций, оставить только последнюю
   */
  private async cleanOldSyncLogs(currentSyncRunId: string): Promise<void> {
    try {
      await this.prisma.syncLogEntry.deleteMany({
        where: {
          syncRunId: { not: currentSyncRunId },
        },
      });
    } catch {
      // Игнорируем ошибки очистки
    }
  }

  /**
   * Сохранить результат последней синхронизации в IntegrationSettings
   */
  private async updateLastSyncDate(): Promise<void> {
    const settings = await this.prisma.integrationSettings.findFirst();
    if (settings) {
      await this.prisma.integrationSettings.update({
        where: { id: settings.id },
        data: { updated_at: new Date() },
      });
    }
  }

  /**
   * Обновить прогресс этапа с сохранением существующих stageDetails
   */
  private async updateStageProgressWithMerge(
    syncRunId: string,
    stage: string,
    created: number,
    updated: number,
    errors: number,
    totalIssues: number,
  ): Promise<void> {
    try {
      const currentRun = await this.prisma.syncRun.findUnique({
        where: { id: syncRunId },
        select: { extensions: true },
      });
      const currentExtensions = (currentRun?.extensions as Record<string, unknown> | null) ?? {};
      const currentStageDetails =
        (currentExtensions?.stageDetails as Record<
          string,
          { created: number; updated: number; errors: number } | null
        > | null) ?? {};

      await this.prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          currentStage: stage,
          createdCount: created,
          updatedCount: updated,
          errorCount: errors,
          totalIssues: totalIssues,
          extensions: {
            ...currentExtensions,
            stageDetails: {
              ...currentStageDetails,
              [stage]: { created, updated, errors },
            },
          },
        },
      });
    } catch {
      // Игнорируем ошибки обновления прогресса
    }
  }
}
