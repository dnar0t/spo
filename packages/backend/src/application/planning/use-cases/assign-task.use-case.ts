/**
 * AssignTaskUseCase
 *
 * Назначает задачу на сотрудника в рамках отчётного периода.
 * - Находит или создаёт PlannedTask для задачи (по issueNumber)
 * - Назначает на сотрудника с указанными часами
 * - Рассчитывает debug/test/mgmt часы на основе процентов периода
 * - Сохраняет изменения
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PlannedTask } from '../../../domain/entities/planned-task.entity';
import { Minutes } from '../../../domain/value-objects/minutes.vo';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface AssignTaskResult {
  /** ID созданной/обновлённой задачи */
  taskId: string;
  /** Номер задачи */
  issueNumber: string;
  /** Назначенный исполнитель */
  assigneeId: string;
  /** Общее запланированное время в часах */
  totalPlannedHours: number;
  /** Запланированное время на разработку в часах */
  plannedDevHours: number;
  /** Запланированное время на тестирование в часах */
  plannedTestHours: number;
  /** Запланированное время на отладку в часах */
  plannedDebugHours: number;
  /** Запланированное время на управление в часах */
  plannedMgmtHours: number;
}

export interface AssignTaskParams {
  periodId: string;
  issueNumber: string;
  summary: string;
  youtrackIssueId?: string | null;
  dto: AssignTaskDto;
}

export class AssignTaskUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(params: AssignTaskParams): Promise<AssignTaskResult> {
    const { periodId, issueNumber, summary, youtrackIssueId, dto } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период в editable состоянии
    if (!period.canEditPlan()) {
      throw new DomainStateError(
        `Cannot assign task in period ${periodId}: current state is "${period.state.value}". ` +
        'Period must be in PLANNING or PERIOD_REOPENED state.',
      );
    }

    // 3. Ищем существующую задачу или создаём новую
    let task = await this.plannedTaskRepository.findByIssueNumber(
      issueNumber,
      periodId,
    );

    if (!task) {
      // Получаем максимальный sortOrder для нового элемента
      const maxSortOrder = await this.plannedTaskRepository.findMaxSortOrder(periodId);

      task = PlannedTask.create({
        periodId,
        issueNumber,
        summary,
        youtrackIssueId: youtrackIssueId ?? null,
        sortOrder: maxSortOrder + 1,
      });
    }

    // 4. Назначаем на сотрудника
    task.assignTo(dto.assigneeId);

    // 5. Рассчитываем часы по категориям на основе процентов периода
    const plannedDevMinutes = Minutes.fromHours(dto.plannedHours);

    // Если часы не указаны явно, рассчитываем через проценты периода
    const testPercent = period.testPercent;
    const debugPercent = period.debugPercent;
    const mgmtPercent = period.mgmtPercent;

    let testMinutes: Minutes | null = null;
    let debugMinutes: Minutes | null = null;
    let mgmtMinutes: Minutes | null = null;

    if (dto.testHours !== undefined) {
      testMinutes = Minutes.fromHours(dto.testHours);
    } else if (testPercent) {
      testMinutes = plannedDevMinutes.percent(testPercent.basisPoints);
    }

    if (dto.debugHours !== undefined) {
      debugMinutes = Minutes.fromHours(dto.debugHours);
    } else if (debugPercent) {
      debugMinutes = plannedDevMinutes.percent(debugPercent.basisPoints);
    }

    if (dto.mgmtHours !== undefined) {
      mgmtMinutes = Minutes.fromHours(dto.mgmtHours);
    } else if (mgmtPercent) {
      mgmtMinutes = plannedDevMinutes.percent(mgmtPercent.basisPoints);
    }

    // 6. Обновляем плановые часы
    task.updatePlannedHours({
      plannedDevMinutes,
      plannedTestMinutes: testMinutes,
      plannedDebugMinutes: debugMinutes,
      plannedMgmtMinutes: mgmtMinutes,
    });

    // 7. Сохраняем
    const saved = await this.plannedTaskRepository.save(task);

    // 8. Возвращаем результат
    return {
      taskId: saved.id,
      issueNumber: saved.issueNumber,
      assigneeId: saved.assigneeId!,
      totalPlannedHours: saved.totalPlannedMinutes.hours,
      plannedDevHours: saved.plannedDevMinutes?.hours ?? 0,
      plannedTestHours: saved.plannedTestMinutes?.hours ?? 0,
      plannedDebugHours: saved.plannedDebugMinutes?.hours ?? 0,
      plannedMgmtHours: saved.plannedMgmtMinutes?.hours ?? 0,
    };
  }
}
