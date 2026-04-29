/**
 * YouTrackExportServiceImpl
 *
 * Реализация порта YouTrackExportService (Infrastructure Layer).
 * Использует YouTrackApiClient для вызовов YouTrack REST API.
 *
 * Обновление задачи:
 *   POST /api/issues/{issueId}
 *   {
 *     "customFields": [{ "id": "94-77", "value": {"name": "{sprintName}"} }]
 *   }
 *
 * Установка assignee:
 *   POST /api/issues/{issueId}
 *   { "customFields": [{ "id": "94-3", "value": {"id": "{youtrackUserId}"} }] }
 *
 * Добавление тега:
 *   POST /api/issues/{issueId}/tags?fields=id,name
 *   { "name": "SPO planned" }
 */
import { Injectable, Logger } from '@nestjs/common';
import { YouTrackApiClient } from '../youtrack-api.client';
import { YouTrackExportService } from '../../../application/integration/ports/youtrack-export-service';

@Injectable()
export class YouTrackExportServiceImpl implements YouTrackExportService {
  private readonly logger = new Logger(YouTrackExportServiceImpl.name);

  // ID custom field'ов в YouTrack
  private static readonly SPRINT_FIELD_ID = '94-77';
  private static readonly ASSIGNEE_FIELD_ID = '94-3';

  constructor(private readonly apiClient: YouTrackApiClient) {}

  /**
   * Установить custom field "Спринт" (ID: 94-77) для задачи.
   * Значение — объект с name = "{month}.{year}", например "4.2025".
   */
  async updateIssueSprint(issueId: string, sprintName: string): Promise<void> {
    this.logger.debug(`Updating sprint for issue ${issueId}: ${sprintName}`);

    await this.apiClient.post(`/issues/${issueId}`, {
      customFields: [
        {
          id: YouTrackExportServiceImpl.SPRINT_FIELD_ID,
          value: { name: sprintName },
        },
      ],
    });

    this.logger.debug(`Sprint updated for issue ${issueId}: ${sprintName}`);
  }

  /**
   * Установить исполнителя (assignee) задачи.
   * Assignee в YouTrack — это custom field (ID: 94-3).
   * Значение — объект с id = youtrackUserId.
   */
  async updateIssueAssignee(issueId: string, youtrackUserId: string): Promise<void> {
    this.logger.debug(`Updating assignee for issue ${issueId}: user ${youtrackUserId}`);

    await this.apiClient.post(`/issues/${issueId}`, {
      customFields: [
        {
          id: YouTrackExportServiceImpl.ASSIGNEE_FIELD_ID,
          value: { id: youtrackUserId },
        },
      ],
    });

    this.logger.debug(`Assignee updated for issue ${issueId}: user ${youtrackUserId}`);
  }

  /**
   * Добавить тег задаче.
   * Использует endpoint POST /api/issues/{issueId}/tags?fields=id,name
   */
  async addIssueTag(issueId: string, tagName: string): Promise<void> {
    this.logger.debug(`Adding tag "${tagName}" to issue ${issueId}`);

    await this.apiClient.post(`/issues/${issueId}/tags?fields=id,name`, {
      name: tagName,
    });

    this.logger.debug(`Tag "${tagName}" added to issue ${issueId}`);
  }
}
