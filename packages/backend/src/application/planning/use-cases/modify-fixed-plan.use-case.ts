/**
 * ModifyFixedPlanUseCase
 *
 * Use case для изменения фиксированного плана спринта директором.
 * - Проверяет, что период существует и не закрыт (допустимые состояния: PLAN_FIXED, FACT_LOADED, EVALUATIONS_DONE)
 * - Проверяет, что задача существует и принадлежит указанному периоду
 * - Обновляет плановые часы задачи по категориям (dev, test, mgmt, debug)
 * - Создаёт новую версию SprintPlan (инкремент версии) с обновлёнными метриками
 * - Создаёт аудит-запись через PeriodTransition с указанием причины изменения (comment)
 * - Публикует событие PlanModifiedEvent (через event bus / outbox)
 * - Возвращает результат с обновлёнными часами и номером новой версии плана
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { SprintPlanRepository } from '../../../domain/repositories/sprint-plan.repository';
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { Minutes } from '../../../domain/value-objects/minutes.vo';
import { PlanModifiedEvent } from '../../../domain/events/plan-modified.event';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface ModifyFixedPlanDto {
  /** ID задачи, часы которой необходимо изменить */
  taskId: string;
  /** Новое плановое время разработки (в минутах) */
  plannedDevMinutes?: number | null;
  /** Новое плановое время тестирования (в минутах) */
  plannedTestMinutes?: number | null;
  /** Новое плановое время управления (в минутах) */
  plannedMgmtMinutes?: number | null;
  /** Новое плановое время отладки (в минутах) */
  plannedDebugMinutes?: number | null;
  /** Обязательный комментарий причины изменения */
  comment: string;
}

export interface ModifyFixedPlanResult {
  /** ID изменённой задачи */
  taskId: string;
  /** Номер задачи (issue) в трекере */
  issueNumber: string;
  /** Номер новой версии плана спринта */
  newVersionNumber: number;
  /** Обновлённое плановое время разработки (в минутах) */
  plannedDevMinutes: number | null;
  /** Обновлённое плановое время тестирования (в минутах) */
  plannedTestMinutes: number | null;
  /** Обновлённое плановое время управления (в минутах) */
  plannedMgmtMinutes: number | null;
  /** Обновлённое плановое время отладки (в минутах) */
  plannedDebugMinutes: number | null;
  /** Дата/время внесения изменения */
  modifiedAt: string;
  /** ID пользователя, внёсшего изменение */
  modifiedByUserId: string;
}

/**
 * Интерфейс для абстракции EventBus / Outbox.
 * Реализация будет предоставлена infrastructure слоем (через DI).
 */
export interface EventBus {
  publish(event: PlanModifiedEvent): Promise<void>;
}

export class ModifyFixedPlanUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly sprintPlanRepository: SprintPlanRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly periodTransitionRepository: PeriodTransitionRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Выполнить модификацию зафиксированного плана.
   *
   * @param periodId - ID отчётного периода
   * @param userId - ID пользователя (директора), вносящего изменения
   * @param dto - DTO с данными изменения (taskId, плановые минуты, comment)
   * @returns ModifyFixedPlanResult - результат модификации
   *
   * @throws NotFoundError - если период или задача не найдены
   * @throws DomainStateError - если период закрыт или находится в неприемлемом состоянии
   */
  async execute(
    periodId: string,
    userId: string,
    dto: ModifyFixedPlanDto,
  ): Promise<ModifyFixedPlanResult> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не закрыт
    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot modify fixed plan for closed period ${periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем, что период находится в одном из допустимых состояний
    //    (PLAN_FIXED, FACT_LOADED, EVALUATIONS_DONE)
    if (period.isPlanning()) {
      throw new DomainStateError(
        `Cannot modify fixed plan for period ${periodId}: current state is "${period.state.value}". ` +
          'Period must be in PLAN_FIXED, FACT_LOADED or EVALUATIONS_DONE state.',
      );
    }

    // 4. Проверяем валидность userId
    if (!userId || userId.trim().length === 0) {
      throw new NotFoundError('User', '(empty)');
    }

    // 5. Проверяем обязательный комментарий
    if (!dto.comment || dto.comment.trim().length === 0) {
      throw new DomainStateError('Comment is required when modifying a fixed plan', {
        periodId,
        taskId: dto.taskId,
      });
    }

    // 6. Загружаем задачу и проверяем её принадлежность к периоду
    const task = await this.plannedTaskRepository.findById(dto.taskId);
    if (!task) {
      throw new NotFoundError('PlannedTask', dto.taskId);
    }

    if (task.periodId !== periodId) {
      throw new DomainStateError(`Task ${dto.taskId} does not belong to period ${periodId}`, {
        periodId,
        taskId: dto.taskId,
        taskPeriodId: task.periodId,
      });
    }

    // 7. Обновляем плановые часы задачи
    task.updatePlannedHours({
      plannedDevMinutes:
        dto.plannedDevMinutes !== undefined
          ? dto.plannedDevMinutes !== null
            ? Minutes.fromMinutes(dto.plannedDevMinutes)
            : null
          : undefined,
      plannedTestMinutes:
        dto.plannedTestMinutes !== undefined
          ? dto.plannedTestMinutes !== null
            ? Minutes.fromMinutes(dto.plannedTestMinutes)
            : null
          : undefined,
      plannedMgmtMinutes:
        dto.plannedMgmtMinutes !== undefined
          ? dto.plannedMgmtMinutes !== null
            ? Minutes.fromMinutes(dto.plannedMgmtMinutes)
            : null
          : undefined,
      plannedDebugMinutes:
        dto.plannedDebugMinutes !== undefined
          ? dto.plannedDebugMinutes !== null
            ? Minutes.fromMinutes(dto.plannedDebugMinutes)
            : null
          : undefined,
    });

    // 8. Сохраняем задачу с обновлёнными часами
    await this.plannedTaskRepository.save(task);

    // 9. Загружаем все задачи периода для пересчёта метрик плана
    const plannedTasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    const totalPlannedMinutes = plannedTasks.reduce(
      (sum, t) => sum.add(t.totalPlannedMinutes),
      Minutes.zero(),
    );
    const taskCount = plannedTasks.length;

    // 10. Загружаем текущий SprintPlan
    let sprintPlan = await this.sprintPlanRepository.findByPeriodId(periodId);
    if (!sprintPlan) {
      throw new NotFoundError('SprintPlan', `for period ${periodId}`);
    }

    // 11. Создаём новую версию плана (инкремент версии) с обновлёнными метриками
    sprintPlan.updateTotalPlanned(totalPlannedMinutes);
    sprintPlan.updateTaskCount(taskCount);
    sprintPlan.incrementVersion();

    // 12. Сохраняем обновлённый план
    const savedPlan = await this.sprintPlanRepository.save(sprintPlan);

    // 13. Создаём аудит-запись через PeriodTransition (без смены состояния)
    const auditEntry = PeriodTransition.forAudit({
      periodId,
      state: period.state,
      transitionedByUserId: userId,
      reason: dto.comment,
    });
    await this.periodTransitionRepository.save(auditEntry);

    // 14. Публикуем событие PlanModifiedEvent
    const event = new PlanModifiedEvent({
      periodId,
      taskId: task.id,
      issueNumber: task.issueNumber,
      newVersionNumber: savedPlan.versionNumber,
      modifiedByUserId: userId,
      plannedDevMinutes: task.plannedDevMinutes?.minutes ?? null,
      plannedTestMinutes: task.plannedTestMinutes?.minutes ?? null,
      plannedMgmtMinutes: task.plannedMgmtMinutes?.minutes ?? null,
      plannedDebugMinutes: task.plannedDebugMinutes?.minutes ?? null,
      comment: dto.comment,
    });
    await this.eventBus.publish(event);

    // 15. Возвращаем результат
    return {
      taskId: task.id,
      issueNumber: task.issueNumber,
      newVersionNumber: savedPlan.versionNumber,
      plannedDevMinutes: task.plannedDevMinutes?.minutes ?? null,
      plannedTestMinutes: task.plannedTestMinutes?.minutes ?? null,
      plannedMgmtMinutes: task.plannedMgmtMinutes?.minutes ?? null,
      plannedDebugMinutes: task.plannedDebugMinutes?.minutes ?? null,
      modifiedAt: new Date().toISOString(),
      modifiedByUserId: userId,
    };
  }
}
