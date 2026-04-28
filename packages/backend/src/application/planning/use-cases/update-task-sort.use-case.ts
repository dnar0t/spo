/**
 * UpdateTaskSortUseCase
 *
 * Обновляет порядок сортировки задачи в бэклоге отчётного периода.
 * - Находит PlannedTask по ID
 * - Обновляет sortOrder задачи
 * - Сохраняет изменения
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface UpdateTaskSortResult {
  /** ID задачи */
  taskId: string;
  /** Номер задачи */
  issueNumber: string;
  /** Новый порядок сортировки */
  sortOrder: number;
}

export class UpdateTaskSortUseCase {
  constructor(
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(taskId: string, sortOrder: number): Promise<UpdateTaskSortResult> {
    // 1. Находим задачу по ID
    const task = await this.plannedTaskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundError('PlannedTask', taskId);
    }

    // 2. Устанавливаем новый порядок сортировки
    task.setSortOrder(sortOrder);

    // 3. Сохраняем изменения
    const saved = await this.plannedTaskRepository.update(task);

    // 4. Возвращаем результат
    return {
      taskId: saved.id,
      issueNumber: saved.issueNumber,
      sortOrder: saved.sortOrder,
    };
  }
}
