/**
 * UpdateTaskReadinessUseCase
 *
 * Обновляет процент готовности задачи в рамках отчётного периода.
 * - Находит PlannedTask по taskId
 * - Проверяет, что период существует и не закрыт
 * - Обновляет процент готовности через доменный метод updateReadiness
 * - Сохраняет изменения
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface UpdateTaskReadinessResult {
  /** ID задачи */
  taskId: string;
  /** Номер задачи */
  issueNumber: string;
  /** Новый процент готовности (в процентах, 0–100) */
  readinessPercent: number;
}

export class UpdateTaskReadinessUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(
    taskId: string,
    readinessPercent: number,
  ): Promise<UpdateTaskReadinessResult> {
    // 1. Находим задачу по ID
    const task = await this.plannedTaskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('PlannedTask', taskId);
    }

    // 2. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(task.periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', task.periodId);
    }

    // 3. Проверяем, что период не закрыт
    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot update readiness for task in closed period ${task.periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId: task.periodId, currentState: period.state.value },
      );
    }

    // 4. Проверяем, что период в editable состоянии
    if (!period.canEditPlan()) {
      throw new DomainStateError(
        `Cannot update readiness in period ${task.periodId}: current state is "${period.state.value}". ` +
          'Period must be in PLANNING or PERIOD_REOPENED state.',
      );
    }

    // 5. Создаём Value Object процент готовности
    const percent = Percentage.fromPercent(readinessPercent);

    // 6. Обновляем готовность задачи через доменный метод
    task.updateReadiness(percent);

    // 7. Сохраняем изменения
    await this.plannedTaskRepository.update(task);

    // 8. Возвращаем результат
    return {
      taskId: task.id,
      issueNumber: task.issueNumber,
      readinessPercent: task.readinessPercent.percent,
    };
  }
}
