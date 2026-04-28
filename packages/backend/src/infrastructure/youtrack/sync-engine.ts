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
  private readonly defaultFields = 'id,idReadable,summary,description,created,updated,resolved,project(id,name,shortName),reporter(id,login,fullName,email),assignee(id,login,fullName,email),customFields(id,name,value(id,name,localizedName)),parent(id,idReadable),subtasks(id,idReadable)';

  constructor(
    private readonly configService: ConfigService,
    private readonly apiClient: YouTrackApiClient,
    private readonly mapper: YouTrackMapper,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Запустить полную синхронизацию
   */
  async runFullSync(triggerType: 'MANUAL' | 'SCHEDULED' = 'MANUAL'): Promise<YouTrackFullSyncResult> {
    if (!this.apiClient.isConfigured) {
      throw new Error(
        'YouTrack API client is not configured. Set YOUTRACK_BASE_URL and YOUTRACK_TOKEN.',
      );
    }

    const startedAt = new Date();
    this.logger.log(`🚀 Starting full sync (${triggerType}) at ${startedAt.toISOString()}`);

    // Создаём запись о запуске синхронизации
    const syncRun = await this.prisma.syncRun.create({
      data: {
        id: uuidv4(),
        triggerType,
        status: 'RUNNING',
        startedAt,
      },
    });

    try {
      // Этап 1: Синхронизация пользователей
      const usersResult = await this.syncUsers(syncRun.id);
      await this.logSyncInfo(syncRun.id, 'Users synced', `Created: ${usersResult.created}, Updated: ${usersResult.updated}`);

      // Этап 2: Синхронизация проектов
      const projectsResult = await this.syncProjects(syncRun.id);
      await this.logSyncInfo(syncRun.id, 'Projects synced', `Created: ${projectsResult.created}, Updated: ${projectsResult.updated}`);

      // Этап 3: Синхронизация задач
      const issuesResult = await this.syncIssues(syncRun.id);
      await this.logSyncInfo(syncRun.id, 'Issues synced', `Created: ${issuesResult.created}, Updated: ${issuesResult.updated}`);

      // Этап 4: Синхронизация work items
      const workItemsResult = await this.syncWorkItems(syncRun.id);
      await this.logSyncInfo(syncRun.id, 'Work items synced', `Created: ${workItemsResult.created}, Updated: ${workItemsResult.updated}`);

      const completedAt = new Date();
      const duration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

      const totalErrors =
        usersResult.errors.length +
        projectsResult.errors.length +
        issuesResult.errors.length +
        workItemsResult.errors.length;

      const status = totalErrors > 0 ? 'PARTIAL' : 'SUCCESS';

      // Обновляем запись о синхронизации
      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status,
          totalIssues: issuesResult.created + issuesResult.updated,
          createdCount:
            usersResult.created + projectsResult.created + issuesResult.created + workItemsResult.created,
          updatedCount:
            usersResult.updated + projectsResult.updated + issuesResult.updated + workItemsResult.updated,
          errorCount: totalErrors,
          errors: totalErrors > 0
            ? {
                users: usersResult.errors,
                projects: projectsResult.errors,
                issues: issuesResult.errors,
                workItems: workItemsResult.errors,
              }
            : null,
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

      this.logger.error(`❌ Sync failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

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
        true, // paginated
      );

      this.logger.log(`Fetched ${users.length} users from YouTrack`);

      for (const ytUser of users) {
        try {
          // Пропускаем гостевых и забаненных пользователей
          if (ytUser.guest || ytUser.banned) continue;

          const userData = this.mapper.mapUser(ytUser);

          // Проверяем, существует ли пользователь по youtrack_user_id
          const existingUser = await this.prisma.user.findFirst({
            where: { youtrack_user_id: ytUser.id },
          });

          if (existingUser) {
            // Обновляем существующего пользователя
            await this.prisma.user.update({
              where: { id: existingUser.id },
              data: {
                email: userData.email ?? existingUser.email,
                full_name: userData.fullName ?? existingUser.fullName,
                youtrack_login: userData.youtrackLogin,
                youtrack_user_id: userData.youtrackUserId,
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
                  full_name: userData.fullName ?? existingByLogin.fullName,
                  youtrack_login: userData.youtrackLogin,
                  youtrack_user_id: userData.youtrackUserId,
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
                  full_name: userData.fullName,
                  youtrack_login: userData.youtrackLogin,
                  youtrack_user_id: userData.youtrackUserId,
                  isActive: true,
                },
              });
              result.created++;
            }
          }
        } catch (error) {
          result.errors.push({
            entityId: ytUser.id,
            message: error instanceof Error ? error.message : 'Failed to sync user',
          });
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

      for (const ytIssue of issues) {
        try {
          const issueData = this.mapper.mapIssue(ytIssue);

          // Проверяем существование
          const existingIssue = await this.prisma.youtrackIssue.findUnique({
            where: { youtrack_id: ytIssue.id },
          });

          let assigneeId: string | null = null;
          if (ytIssue.assignee) {
            const assignee = await this.prisma.user.findFirst({
              where: { youtrack_user_id: ytIssue.assignee.id },
            });
            assigneeId = assignee?.id || null;
          }

          if (existingIssue) {
            await this.prisma.youtrackIssue.update({
              where: { id: existingIssue.id },
              data: {
                summary: issueData.summary,
                description: issueData.description,
                project_name: issueData.projectName,
                system_name: issueData.systemName,
                sprint_name: issueData.sprintName,
                type_name: issueData.typeName,
                priority_name: issueData.priorityName,
                state_name: issueData.stateName,
                is_resolved: issueData.isResolved,
                assignee_id: assigneeId,
                estimation_minutes: issueData.estimationMinutes,
                parent_yt_id: issueData.parentYtId,
                last_sync_at: new Date(),
                updated_at: new Date(),
              },
            });
            issueMap.set(existingIssue.youtrack_id, existingIssue.id);
            result.updated++;
          } else {
            const newIssue = await this.prisma.youtrackIssue.create({
              data: {
                id: uuidv4(),
                youtrack_id: issueData.youtrackId,
                issue_number: issueData.issueNumber,
                summary: issueData.summary,
                description: issueData.description,
                project_name: issueData.projectName,
                system_name: issueData.systemName,
                sprint_name: issueData.sprintName,
                type_name: issueData.typeName,
                priority_name: issueData.priorityName,
                state_name: issueData.stateName,
                is_resolved: issueData.isResolved,
                assignee_id: assigneeId,
                estimation_minutes: issueData.estimationMinutes,
                parent_yt_id: issueData.parentYtId,
                last_sync_at: new Date(),
              },
            });
            issueMap.set(newIssue.youtrack_id, newIssue.id);
            result.created++;
          }
        } catch (error) {
          result.errors.push({
            entityId: ytIssue.id,
            message: error instanceof Error ? error.message : 'Failed to sync issue',
          });
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
              parent_issue_id: parentId,
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
        select: { id: true, youtrack_id: true, issue_number: true },
      });

      this.logger.log(`Loading work items for ${issues.length} issues`);

      const workItemFields = 'id,author(id,login,fullName),text,textPreview,type(id,name),duration(presentation,minutes),date,created,updated,issue(id,idReadable)';

      for (const issue of issues) {
        try {
          const workItems = await this.apiClient.get<YouTrackWorkItem[]>(
            `/issues/${issue.youtrack_id}/timeTracking/workItems`,
            { fields: workItemFields },
            true, // paginated
          );

          for (const ytWorkItem of workItems) {
            try {
              const workItemData = this.mapper.mapWorkItem(ytWorkItem, issue.id);

              // Находим автора по youtrack_login
              let authorId: string | null = null;
              if (workItemData.authorLogin) {
                const author = await this.prisma.user.findFirst({
                  where: { youtrack_login: workItemData.authorLogin },
                });
                authorId = author?.id || null;
              }

              // Проверяем существование work item
              const existingWorkItem = await this.prisma.workItem.findFirst({
                where: {
                  youtrack_work_item_id: ytWorkItem.id,
                  issue_id: issue.id,
                },
              });

              if (existingWorkItem) {
                await this.prisma.workItem.update({
                  where: { id: existingWorkItem.id },
                  data: {
                    author_id: authorId,
                    duration_minutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    work_date: workItemData.workDate,
                    work_type_name: workItemData.workTypeName,
                  },
                });
                result.updated++;
              } else {
                await this.prisma.workItem.create({
                  data: {
                    id: uuidv4(),
                    issue_id: issue.id,
                    youtrack_work_item_id: ytWorkItem.id,
                    author_id: authorId,
                    duration_minutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    work_date: workItemData.workDate,
                    work_type_name: workItemData.workTypeName,
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
            entityId: issue.issue_number,
            message: error instanceof Error ? error.message : 'Failed to fetch work items',
          });
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
  async syncWorkItemsByPeriod(periodId: string, startDate: Date, endDate: Date): Promise<YouTrackSyncResult> {
    const result: YouTrackSyncResult = { created: 0, updated: 0, deleted: 0, errors: [] };

    try {
      const issues = await this.prisma.youtrackIssue.findMany({
        select: { id: true, youtrack_id: true, issue_number: true },
      });

      const workItemFields = 'id,author(id,login,fullName),text,textPreview,type(id,name),duration(presentation,minutes),date,created,updated,issue(id,idReadable)';

      for (const issue of issues) {
        try {
          const workItems = await this.apiClient.get<YouTrackWorkItem[]>(
            `/issues/${issue.youtrack_id}/timeTracking/workItems`,
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
                  where: { youtrack_login: workItemData.authorLogin },
                });
                authorId = author?.id || null;
              }

              const existingWorkItem = await this.prisma.workItem.findFirst({
                where: {
                  youtrack_work_item_id: ytWorkItem.id,
                  issue_id: issue.id,
                },
              });

              if (existingWorkItem) {
                await this.prisma.workItem.update({
                  where: { id: existingWorkItem.id },
                  data: {
                    author_id: authorId,
                    duration_minutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    work_date: workItemData.workDate,
                    work_type_name: workItemData.workTypeName,
                    period_id: periodId,
                  },
                });
                result.updated++;
              } else {
                await this.prisma.workItem.create({
                  data: {
                    id: uuidv4(),
                    issue_id: issue.id,
                    youtrack_work_item_id: ytWorkItem.id,
                    author_id: authorId,
                    duration_minutes: workItemData.durationMinutes,
                    description: workItemData.description,
                    work_date: workItemData.workDate,
                    work_type_name: workItemData.workTypeName,
                    period_id: periodId,
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
            entityId: issue.issue_number,
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
   * Логирование информационных сообщений в SyncLogEntry
   */
  private async logSyncInfo(
    syncRunId: string,
    message: string,
    details?: string,
  ): Promise<void> {
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
}
