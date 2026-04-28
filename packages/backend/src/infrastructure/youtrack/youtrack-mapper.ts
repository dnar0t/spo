import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import {
  YouTrackIssue,
  YouTrackUser,
  YouTrackWorkItem,
  YouTrackProject,
  YouTrackSyncResult,
} from './youtrack.types';

/**
 * YouTrack Mapper
 *
 * Преобразует сырые ответы YouTrack REST API в доменные сущности и DTO.
 * Отделяет формат API от внутреннего представления.
 */
@Injectable()
export class YouTrackMapper {
  /**
   * Преобразовать пользователя YouTrack (Hub) в доменного User
   */
  mapUser(ytUser: YouTrackUser): Partial<{
    login: string;
    email: string | null;
    fullName: string | null;
    youtrackLogin: string;
    youtrackUserId: string;
  }> {
    return {
      login: ytUser.login,
      email: ytUser.email || null,
      fullName: ytUser.fullName || null,
      youtrackLogin: ytUser.login,
      youtrackUserId: ytUser.id,
    };
  }

  /**
   * Извлечь пользователя из YouTrack задачи (assignee)
   */
  mapAssignee(ytIssue: YouTrackIssue): { login: string; youtrackUserId: string } | null {
    if (!ytIssue.assignee) return null;
    return {
      login: ytIssue.assignee.login,
      youtrackUserId: ytIssue.assignee.id,
    };
  }

  /**
   * Извлечь значение кастомного поля по имени
   */
  private extractCustomFieldValue(
    customFields: YouTrackIssue['customFields'],
    fieldName: string,
  ): string | null {
    if (!customFields) return null;
    const field = customFields.find((f) => f.name === fieldName);
    if (!field || !field.value) return null;

    if (Array.isArray(field.value)) {
      return field.value.map((v) => v.name).join(', ') || null;
    }

    return (field.value as { name: string }).name || null;
  }

  /**
   * Преобразовать задачу YouTrack в данные для сохранения
   */
  mapIssue(ytIssue: YouTrackIssue): {
    youtrackId: string;
    issueNumber: string;
    summary: string;
    description: string | null;
    projectName: string | null;
    systemName: string | null;
    sprintName: string | null;
    typeName: string | null;
    priorityName: string | null;
    stateName: string | null;
    isResolved: boolean;
    assigneeId: string | null;
    estimationMinutes: number | null;
    parentYtId: string | null;
  } {
    const systemName = this.extractCustomFieldValue(ytIssue.customFields, 'Система');
    const sprintName = this.extractCustomFieldValue(ytIssue.customFields, 'Спринт');
    const typeName = this.extractCustomFieldValue(ytIssue.customFields, 'Type');
    const priorityName = this.extractCustomFieldValue(ytIssue.customFields, 'Priority');

    // Состояние задачи берём из ProjectCustomField "State" или из поля resolved
    const stateName = ytIssue.resolved
      ? 'Resolved'
      : this.extractCustomFieldValue(ytIssue.customFields, 'State') || 'Open';

    return {
      youtrackId: ytIssue.id,
      issueNumber: ytIssue.idReadable,
      summary: ytIssue.summary,
      description: ytIssue.description || null,
      projectName: ytIssue.project?.name || null,
      systemName,
      sprintName,
      typeName,
      priorityName,
      stateName,
      isResolved: ytIssue.resolved,
      assigneeId: ytIssue.assignee?.id || null,
      estimationMinutes: null, // YouTrack estimation может быть в отдельном поле
      parentYtId: ytIssue.parent?.id || null,
    };
  }

  /**
   * Преобразовать Work Item YouTrack в данные для сохранения
   */
  mapWorkItem(
    ytWorkItem: YouTrackWorkItem,
    issueId: string,
  ): {
    youtrackWorkItemId: string;
    authorLogin: string | null;
    durationMinutes: number;
    description: string | null;
    workDate: Date | null;
    workTypeName: string | null;
  } {
    return {
      youtrackWorkItemId: ytWorkItem.id,
      authorLogin: ytWorkItem.author?.login || ytWorkItem.creator?.login || null,
      durationMinutes: ytWorkItem.duration.minutes,
      description: ytWorkItem.text || ytWorkItem.textPreview || null,
      workDate: ytWorkItem.date ? new Date(ytWorkItem.date) : null,
      workTypeName: ytWorkItem.type?.name || null,
    };
  }

  /**
   * Преобразовать проект YouTrack
   */
  mapProject(ytProject: YouTrackProject): {
    youtrackId: string;
    name: string;
    shortName: string;
  } {
    return {
      youtrackId: ytProject.id,
      name: ytProject.name,
      shortName: ytProject.shortName,
    };
  }

  /**
   * Создать пустой SyncResult
   */
  createEmptySyncResult(): YouTrackSyncResult {
    return {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
  }

  /**
   * Склеить несколько SyncResult в один
   */
  mergeSyncResults(results: YouTrackSyncResult[]): YouTrackSyncResult {
    return results.reduce(
      (acc, result) => ({
        created: acc.created + result.created,
        updated: acc.updated + result.updated,
        deleted: acc.deleted + result.deleted,
        errors: [...acc.errors, ...result.errors],
      }),
      this.createEmptySyncResult(),
    );
  }
}
