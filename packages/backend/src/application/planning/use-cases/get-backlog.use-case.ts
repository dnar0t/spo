/**
 * GetBacklogUseCase
 *
 * Загружает и возвращает backlog (список задач) для указанного отчётного периода.
 * - Принимает periodId и фильтры (проекты, приоритеты, поиск)
 * - Загружает задачи из YouTrack для данного периода (по проектам из фильтра периода)
 * - Строит дерево задач (task → parent issue → ...)
 * - Сортирует по readiness и приоритету
 * - Возвращает backlog с пагинацией
 */
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PlannedTask } from '../../../domain/entities/planned-task.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';
import {
  PaginationDto,
  PaginatedResult,
  toPaginatedResult,
} from '../../common/pagination.dto';

export interface BacklogItem {
  /** ID задачи */
  id: string;
  /** Номер задачи в YouTrack (PROJECT-123) */
  issueNumber: string;
  /** Краткое описание */
  summary: string;
  /** ID задачи в YouTrack */
  youtrackIssueId: string | null;
  /** Назначенный исполнитель */
  assigneeId: string | null;
  /** Процент готовности (0-100) */
  readinessPercent: number;
  /** Является ли запланированной */
  isPlanned: boolean;
  /** Общее запланированное время в часах */
  totalPlannedHours: number;
  /** Порядок сортировки */
  sortOrder: number;
  /** Номер родительской задачи */
  parentIssueNumber: string | null;
  /** Дочерние задачи (дерево) */
  children: BacklogItem[];
}

export interface GetBacklogFilters {
  /** Фильтр по проектам (идентификаторы проектов в YouTrack) */
  projectIds?: string[];
  /** Фильтр по приоритетам */
  priorities?: string[];
  /** Поиск по тексту (issue number или summary) */
  search?: string;
  /** Только запланированные */
  onlyPlanned?: boolean;
  /** Только незапланированные */
  onlyUnplanned?: boolean;
}

export class GetBacklogUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
  ) {}

  async execute(
    periodId: string,
    filters: GetBacklogFilters,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<BacklogItem>> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Загружаем все задачи для периода
    let tasks: PlannedTask[];

    if (filters.onlyPlanned) {
      tasks = await this.plannedTaskRepository.findPlannedByPeriodId(periodId);
    } else if (filters.onlyUnplanned) {
      tasks = await this.plannedTaskRepository.findUnplannedByPeriodId(periodId);
    } else {
      tasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    }

    // 3. Применяем фильтры
    if (filters.projectIds && filters.projectIds.length > 0) {
      tasks = tasks.filter((task) =>
        filters.projectIds!.some((projectId) =>
          task.issueNumber.startsWith(projectId),
        ),
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.issueNumber.toLowerCase().includes(searchLower) ||
          task.summary.toLowerCase().includes(searchLower),
      );
    }

    // 4. Строим дерево задач: определяем parent-child отношения
    const taskMap = new Map<string, BacklogItem>();
    const rootTasks: BacklogItem[] = [];

    // Сначала создаём BacklogItem для каждой задачи
    for (const task of tasks) {
      const item: BacklogItem = {
        id: task.id,
        issueNumber: task.issueNumber,
        summary: task.summary,
        youtrackIssueId: task.youtrackIssueId,
        assigneeId: task.assigneeId,
        readinessPercent: task.readinessPercent.percent,
        isPlanned: task.isPlanned,
        totalPlannedHours: task.totalPlannedMinutes.hours,
        sortOrder: task.sortOrder,
        parentIssueNumber: task.parentIssueNumber,
        children: [],
      };
      taskMap.set(task.id, item);
    }

    // Строим дерево: распределяем задачи по родителям
    for (const item of taskMap.values()) {
      if (item.parentIssueNumber) {
        // Ищем родителя по parentIssueNumber среди всех задач
        const parent = tasks.find(
          (t) => t.issueNumber === item.parentIssueNumber,
        );
        if (parent) {
          const parentItem = taskMap.get(parent.id);
          if (parentItem) {
            parentItem.children.push(item);
            continue;
          }
        }
      }
      // Если нет родителя или родитель не найден — это корневая задача
      rootTasks.push(item);
    }

    // 5. Сортируем: сначала по readiness (возрастание), потом по sortOrder
    const sortTasks = (items: BacklogItem[]): void => {
      items.sort((a, b) => {
        // Сначала сортируем по готовности (менее готовые — выше)
        if (a.readinessPercent !== b.readinessPercent) {
          return a.readinessPercent - b.readinessPercent;
        }
        // Затем по порядку сортировки
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        // По номеру задачи для стабильности
        return a.issueNumber.localeCompare(b.issueNumber);
      });

      // Рекурсивно сортируем дочерние задачи
      for (const item of items) {
        if (item.children.length > 0) {
          sortTasks(item.children);
        }
      }
    };

    sortTasks(rootTasks);

    // 6. Применяем пагинацию (только для корневых задач)
    const total = rootTasks.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedItems = rootTasks.slice(
      startIndex,
      startIndex + pagination.limit,
    );

    // 7. Возвращаем результат
    return toPaginatedResult(paginatedItems, total, pagination);
  }
}
