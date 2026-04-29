/**
 * YouTrackExportService Interface (Application Layer Port)
 *
 * Порт для экспорта данных плана в YouTrack.
 * Определяет контракт, который должны реализовать инфраструктурные сервисы
 * для обновления задач YouTrack после фиксации плана спринта.
 */
export interface YouTrackExportService {
  /**
   * Установить custom field "Спринт" (ID: 94-77) для задачи.
   *
   * @param issueId - ID задачи в YouTrack (youtrackIssueId)
   * @param sprintName - название спринта (например, "4.2025")
   */
  updateIssueSprint(issueId: string, sprintName: string): Promise<void>;

  /**
   * Установить исполнителя (assignee) задачи.
   *
   * @param issueId - ID задачи в YouTrack (youtrackIssueId)
   * @param youtrackUserId - ID пользователя в YouTrack
   */
  updateIssueAssignee(issueId: string, youtrackUserId: string): Promise<void>;

  /**
   * Добавить тег задаче.
   *
   * @param issueId - ID задачи в YouTrack (youtrackIssueId)
   * @param tagName - название тега (например, "SPO planned")
   */
  addIssueTag(issueId: string, tagName: string): Promise<void>;
}
