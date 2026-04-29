/**
 * CarryOverReadinessUseCase
 *
 * Переносит процент готовности задач из предыдущего отчётного периода в текущий.
 * Для каждой задачи текущего периода, если в предыдущем периоде есть задача
 * с таким же issueNumber, копирует readinessPercent из предыдущей задачи.
 *
 * Особенности:
 * - Если предыдущего периода не существует — возвращает пустой результат (не ошибка)
 * - Процент готовности передаётся через доменный метод task.updateReadiness(Percentage)
 * - Использует Percentage (basis points), не float
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { Percentage } from '../../../domain/value-objects/percentage.vo';

export interface CarryOverReadinessResult {
  /** ID текущего периода */
  periodId: string;
  /** Общее количество задач в текущем периоде */
  totalTasksInPeriod: number;
  /** Количество задач, у которых был обновлён процент готовности */
  updatedTasks: number;
  /** Список issueNumber задач, которым перенесён процент готовности */
  updatedIssueNumbers: string[];
}

export class CarryOverReadinessUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(periodId: string): Promise<CarryOverReadinessResult> {
    // 1. Находим предыдущий период
    const previousPeriod = await this.reportingPeriodRepository.findPreviousPeriod(periodId);

    // 2. Если предыдущего периода нет — возвращаем пустой результат
    if (!previousPeriod) {
      const currentTasks = await this.plannedTaskRepository.findByPeriodId(periodId);
      return {
        periodId,
        totalTasksInPeriod: currentTasks.length,
        updatedTasks: 0,
        updatedIssueNumbers: [],
      };
    }

    // 3. Загружаем задачи текущего и предыдущего периода
    const currentTasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    const previousTasks = await this.plannedTaskRepository.findByPeriodId(previousPeriod.id);

    // 4. Строим Map задач предыдущего периода по issueNumber для быстрого поиска
    const previousTasksByIssue = new Map<string, { readinessPercent: Percentage }>();
    for (const task of previousTasks) {
      previousTasksByIssue.set(task.issueNumber, {
        readinessPercent: task.readinessPercent,
      });
    }

    // 5. Обновляем готовность задач текущего периода, где есть совпадение по issueNumber
    const updatedIssueNumbers: string[] = [];

    for (const currentTask of currentTasks) {
      const previousTaskData = previousTasksByIssue.get(currentTask.issueNumber);
      if (!previousTaskData) {
        continue; // задачи с таким issueNumber нет в предыдущем периоде — пропускаем
      }

      // Пропускаем, если процент готовности уже совпадает (чтобы не делать лишних запросов)
      if (currentTask.readinessPercent.equals(previousTaskData.readinessPercent)) {
        continue;
      }

      // Обновляем через доменный метод
      currentTask.updateReadiness(previousTaskData.readinessPercent);

      // Сохраняем изменения
      await this.plannedTaskRepository.update(currentTask);

      updatedIssueNumbers.push(currentTask.issueNumber);
    }

    // 6. Возвращаем результат
    return {
      periodId,
      totalTasksInPeriod: currentTasks.length,
      updatedTasks: updatedIssueNumbers.length,
      updatedIssueNumbers,
    };
  }
}
