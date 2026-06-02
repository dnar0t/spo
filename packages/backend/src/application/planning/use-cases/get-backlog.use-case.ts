import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
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
  id: string;
  issueNumber: string;
  summary: string;
  youtrackIssueId: string | null;
  assigneeId: string | null;
  readinessPercent: number;
  isPlanned: boolean;
  totalPlannedHours: number;
  sortOrder: number;
  parentIssueNumber: string | null;
  children: BacklogItem[];
}

export interface GetBacklogFilters {
  projectIds?: string[];
  priorities?: string[];
  search?: string;
  onlyPlanned?: boolean;
  onlyUnplanned?: boolean;
  systemName?: string;
  typeName?: string;
}

export class GetBacklogUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    periodId: string,
    filters: GetBacklogFilters,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<BacklogItem>> {
    let period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      // If not a reporting period, check if it's a sprint (planning_settings) ID
      const sprint = await this.prisma.planningSettings.findUnique({
        where: { id: periodId },
        select: { extensions: true }
      });
      if (sprint?.extensions) {
        const ext = sprint.extensions as Record<string, unknown>;
        const month = typeof ext.month === 'number' ? ext.month : undefined;
        const year = typeof ext.year === 'number' ? ext.year : undefined;
        if (month !== undefined && year !== undefined) {
          period = await this.reportingPeriodRepository.findByMonthYear(month, year);
        }
      }
      if (!period) {
        // No reporting period found, fall back to YouTrack backlog
        return this.loadYouTrackBacklog(filters, pagination);
      }
    }
    let tasks: PlannedTask[];
    if (filters.onlyPlanned) {
      tasks = await this.plannedTaskRepository.findPlannedByPeriodId(periodId);
    } else if (filters.onlyUnplanned) {
      tasks = await this.plannedTaskRepository.findUnplannedByPeriodId(periodId);
    } else {
      tasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    }
    if (tasks.length === 0) {
      return this.loadYouTrackBacklog(filters, pagination);
    }
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
    const taskMap = new Map<string, BacklogItem>();
    const rootTasks: BacklogItem[] = [];
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
    for (const item of taskMap.values()) {
      if (item.parentIssueNumber) {
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
      rootTasks.push(item);
    }
    const sortTasks = (items: BacklogItem[]): void => {
      items.sort((a, b) => {
        if (a.readinessPercent !== b.readinessPercent) {
          return a.readinessPercent - b.readinessPercent;
        }
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.issueNumber.localeCompare(b.issueNumber);
      });
      for (const item of items) {
        if (item.children.length > 0) {
          sortTasks(item.children);
        }
      }
    };
    sortTasks(rootTasks);
    const total = rootTasks.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedItems = rootTasks.slice(
      startIndex,
      startIndex + pagination.limit,
    );
    return toPaginatedResult(paginatedItems, total, pagination);
  }

  private async loadYouTrackBacklog(
    filters: GetBacklogFilters,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<BacklogItem>> {
    const where: Record<string, unknown> = {};
    if (filters.projectIds && filters.projectIds.length > 0) {
      where.projectName = { in: filters.projectIds };
    }
    if (filters.systemName) {
      where.systemName = filters.systemName;
    }
    if (filters.typeName) {
      where.typeName = filters.typeName;
    }
    if (filters.search) {
      where.OR = [
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { issueNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const safeLimit = Math.min(Math.max(1, pagination.limit), 9999);
    const skip = (pagination.page - 1) * safeLimit;
    const [issues, total] = await Promise.all([
      this.prisma.youTrackIssue.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take: safeLimit,
        skip,
        select: {
          id: true, issueNumber: true, summary: true,
          projectName: true, systemName: true, typeName: true,
          stateName: true, isResolved: true, assigneeId: true,
          estimationMinutes: true, parentIssueId: true,
          lastSyncAt: true, updatedAt: true,
        },
      }),
      this.prisma.youTrackIssue.count({ where }),
    ]);
    const allIssuesForTree = issues.length > 0 ? await this.prisma.youTrackIssue.findMany({
      where: {
        OR: [
          { id: { in: issues.map(i => i.id) } },
          { parentIssueId: { in: issues.map(i => i.id).filter(Boolean) } },
          { childIssues: { some: { id: { in: issues.map(i => i.id) } } } },
        ],
      },
      select: {
        id: true, issueNumber: true, summary: true,
        projectName: true, systemName: true, typeName: true,
        stateName: true, isResolved: true, assigneeId: true,
        estimationMinutes: true, parentIssueId: true,
        lastSyncAt: true, updatedAt: true,
      },
    }) : [];
    const issueMap = new Map<string, typeof allIssuesForTree[0]>();
    const childMap = new Map<string, string[]>();
    for (const issue of allIssuesForTree) {
      issueMap.set(issue.id, issue);
      if (issue.parentIssueId) {
        const children = childMap.get(issue.parentIssueId) ?? [];
        children.push(issue.id);
        childMap.set(issue.parentIssueId, children);
      }
    }
    const buildItem = (issue: typeof allIssuesForTree[0]): BacklogItem => {
      const childItems = (childMap.get(issue.id) ?? [])
        .map(childId => {
          const child = issueMap.get(childId);
          return child ? buildItem(child) : null;
        })
        .filter((n): n is BacklogItem => n !== null);
      return {
        id: issue.id,
        issueNumber: issue.issueNumber,
        summary: issue.summary,
        youtrackIssueId: issue.id,
        assigneeId: issue.assigneeId,
        readinessPercent: issue.isResolved ? 100 : 0,
        isPlanned: false,
        totalPlannedHours: (issue.estimationMinutes ?? 0) / 60,
        sortOrder: 0,
        parentIssueNumber: null,
        children: childItems,
      };
    };
    const rootIssues = allIssuesForTree.filter(issue => {
      if (!issue.parentIssueId) return true;
      return !issueMap.has(issue.parentIssueId);
    });
    const rootItems = rootIssues.map(buildItem);
    return toPaginatedResult(rootItems, total, pagination);
  }
}
