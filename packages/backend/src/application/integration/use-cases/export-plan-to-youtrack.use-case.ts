/**
 * ExportPlanToYouTrackUseCase
 *
 * Use case для экспорта зафиксированного плана спринта в YouTrack.
 * Вызывается после события PlanFixedEvent.
 *
 * Для каждой запланированной задачи (PlannedTask) с youtrackIssueId:
 * 1. Устанавливает custom field "Спринт" (ID: 94-77) — "{month}.{год}"
 * 2. Устанавливает assignee задаче (если назначен)
 * 3. Добавляет тег "SPO planned"
 *
 * Логирует результаты синхронизации (успешно/ошибки).
 */
import { Logger } from '@nestjs/common';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { YouTrackExportService } from '../ports/youtrack-export-service';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface ExportPlanToYouTrackParams {
  /** ID отчётного периода, план которого экспортируется */
  periodId: string;
  /** ID пользователя, инициировавшего фиксацию плана */
  fixedByUserId: string;
}

export interface ExportPlanToYouTrackResult {
  /** Сколько задач успешно обновлено */
  succeeded: number;
  /** Сколько задач с ошибками */
  failed: number;
  /** Детальная информация об ошибках */
  errors: Array<{
    issueNumber: string;
    youtrackIssueId: string;
    message: string;
  }>;
  /** Количество задач, пропущенных из-за отсутствия youtrackIssueId */
  skipped: number;
}

export class ExportPlanToYouTrackUseCase {
  private readonly logger = new Logger(ExportPlanToYouTrackUseCase.name);

  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly userRepository: UserRepository,
    private readonly youtrackExportService: YouTrackExportService,
  ) {}

  async execute(params: ExportPlanToYouTrackParams): Promise<ExportPlanToYouTrackResult> {
    const { periodId } = params;

    // 1. Проверяем существование периода
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Формируем название спринта "{month}.{year}"
    const sprintName = `${period.month}.${period.year}`;

    // 3. Получаем все запланированные задачи периода
    const plannedTasks = await this.plannedTaskRepository.findByPeriodId(periodId);

    this.logger.log(
      `Exporting plan to YouTrack for period ${period.month}/${period.year}: ` +
        `${plannedTasks.length} tasks found`,
    );

    // 4. Обрабатываем результат
    const result: ExportPlanToYouTrackResult = {
      succeeded: 0,
      failed: 0,
      errors: [],
      skipped: 0,
    };

    // 5. Для каждой задачи обновляем YouTrack
    for (const task of plannedTasks) {
      // Пропускаем задачи без youtrackIssueId
      if (!task.youtrackIssueId) {
        result.skipped++;
        continue;
      }

      try {
        // 5a. Устанавливаем custom field "Спринт"
        await this.youtrackExportService.updateIssueSprint(
          task.youtrackIssueId,
          sprintName,
        );

        // 5b. Если есть assignee, находим youtrackUserId и устанавливаем assignee
        if (task.assigneeId) {
          await this.setAssigneeIfPossible(task.youtrackIssueId, task.assigneeId, result);
        }

        // 5c. Добавляем тег "SPO planned"
        await this.youtrackExportService.addIssueTag(
          task.youtrackIssueId,
          'SPO planned',
        );

        result.succeeded++;
        this.logger.debug(
          `Task ${task.issueNumber} (${task.youtrackIssueId}) successfully updated in YouTrack`,
        );
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          issueNumber: task.issueNumber,
          youtrackIssueId: task.youtrackIssueId,
          message: errorMessage,
        });
        this.logger.error(
          `Failed to update task ${task.issueNumber} (${task.youtrackIssueId}) in YouTrack: ${errorMessage}`,
        );
      }
    }

    // 6. Логируем итоговый результат
    this.logger.log(
      `YouTrack export completed for period ${period.month}/${period.year}: ` +
        `${result.succeeded} succeeded, ${result.failed} failed, ${result.skipped} skipped`,
    );

    return result;
  }

  /**
   * Найти youtrackUserId по assigneeId и установить assignee в YouTrack.
   * Если пользователь не найден или у него нет youtrackUserId — логируем предупреждение,
   * но не прерываем обновление задачи (другие шаги продолжаются).
   */
  private async setAssigneeIfPossible(
    youtrackIssueId: string,
    assigneeId: string,
    result: ExportPlanToYouTrackResult,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(assigneeId);

      if (!user) {
        this.logger.warn(
          `User ${assigneeId} not found in local database. Skipping assignee update for issue ${youtrackIssueId}`,
        );
        return;
      }

      if (!user.youtrackUserId) {
        this.logger.warn(
          `User ${user.login} (${assigneeId}) has no youtrackUserId. Skipping assignee update for issue ${youtrackIssueId}`,
        );
        return;
      }

      await this.youtrackExportService.updateIssueAssignee(
        youtrackIssueId,
        user.youtrackUserId,
      );
    } catch (error) {
      // Ошибка поиска пользователя не должна прерывать весь процесс
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to resolve assignee for issue ${youtrackIssueId}: ${errorMessage}`,
      );
    }
  }
}
