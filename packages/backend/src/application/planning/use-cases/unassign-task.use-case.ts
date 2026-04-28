/**
 * UnassignTaskUseCase
 *
 * Снимает назначение с задачи в рамках отчётного периода.
 * - Находит PlannedTask по ID
 * - Снимает назначение (assigneeId → null)
 * - Обнуляет плановые часы
 * - Сохраняет изменения
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface UnassignTaskResult {
  /** ID задачи */
  taskId: string;
  /** Номер задачи */
  issueNumber: string;
  /** Была ли задача назначена (true — сняли, false — не была назначена) */
  wasAssigned: boolean;
}

export class UnassignTaskUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(taskId: string): Promise<UnassignTaskResult> {
    // 1. Находим задачу по ID
    const task = await this.plannedTaskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('PlannedTask', taskId);
    }

    // 2. Проверяем, что период не закрыт
    const period = await this.reportingPeriodRepository.findById(task.periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', task.periodId);
    }

    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot unassign task for closed period ${task.periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId: task.periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем, что период в editable состоянии
    if (!period.canEditPlan()) {
      throw new DomainStateError(
        `Cannot unassign task in period ${task.periodId}: current state is "${period.state.value}". ` +
          'Period must be in PLANNING or PERIOD_REOPENED state.',
      );
    }

    // 3. Проверяем, назначена ли задача
    const wasAssigned = task.assigneeId !== null;

    if (wasAssigned) {
      // 4. Снимаем назначение
      task.unassign();

      // 5. Обнуляем плановые часы
      task.updatePlannedHours({
        plannedDevMinutes: null,
        plannedTestMinutes: null,
        plannedDebugMinutes: null,
        plannedMgmtMinutes: null,
      });

      // 6. Сохраняем
      await this.plannedTaskRepository.update(task);
    }

    // 7. Возвращаем результат
    return {
      taskId: task.id,
      issueNumber: task.issueNumber,
      wasAssigned,
    };
  }
}
