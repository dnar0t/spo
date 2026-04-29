/**
 * PrismaYouTrackIssueRepository
 *
 * Prisma-реализация порта IYouTrackIssueRepository.
 * Предоставляет доступ к YouTrackIssue для финансовых use cases.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IYouTrackIssueRepository,
  YOUTRACK_ISSUE_REPOSITORY,
} from '../../../application/finance/ports/youtrack-issue-repository';
import {
  YouTrackIssueDto,
  IssueHierarchyDto,
} from '../../../application/finance/dto/youtrack-issue.dto';
import { PeriodGroupItemTotals } from '../../../application/finance/use-cases/get-period-groups.use-case';

@Injectable()
export class PrismaYouTrackIssueRepository implements IYouTrackIssueRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Найти все YouTrackIssue, связанные с PersonalReportLine указанного периода.
   * Связь идёт через PersonalReportLine.youtrackIssueId → YouTrackIssue.id.
   * Период задаётся по PersonalReport.periodId.
   */
  async findByPeriodId(periodId: number): Promise<YouTrackIssueDto[]> {
    // Получаем уникальные youtrackIssueId из PersonalReportLine за период
    const lines = await this.prisma.personalReportLine.findMany({
      where: {
        personalReport: {
          periodId: String(periodId),
        },
      },
      select: {
        youtrackIssueId: true,
      },
      distinct: ['youtrackIssueId'],
    });

    const issueIds = lines.map((l) => l.youtrackIssueId);
    if (issueIds.length === 0) {
      return [];
    }

    // Загружаем все YouTrackIssue по найденным ID
    const issues = await this.prisma.youTrackIssue.findMany({
      where: {
        id: { in: issueIds },
      },
    });

    return issues.map(
      (issue: {
        id: string;
        youtrackId: string;
        issueNumber: string;
        summary: string;
        projectName: string | null;
        systemName: string | null;
        sprintName: string | null;
        typeName: string | null;
        parentIssueId: string | null;
        parentYtId: string | null;
        estimationMinutes: number | null;
      }) => this.toDto(issue),
    );
  }

  /**
   * Построить иерархию задач (parent-child) для периода.
   * Возвращает массив корневых узлов (те, у кого нет parentIssueId).
   * Каждый узел содержит агрегированные financial totals для своего поддерева.
   *
   * ВАЖНО: Поскольку финансовые данные (PersonalReportLine) не имеют
   * прямой иерархической связи, мы собираем все youtrackIssueId из отчётов
   * периода и распределяем их по узлам иерархии.
   * Каждый узел включает только те issueIds, которые соответствуют его
   * собственному issueId (не детей). Агрегация по поддереву вычисляется
   * рекурсивно в use case.
   */
  async findHierarchyByPeriodId(periodId: number): Promise<IssueHierarchyDto[]> {
    // 1. Получаем все YouTrackIssue, связанные с периодом
    const lines = await this.prisma.personalReportLine.findMany({
      where: {
        personalReport: {
          periodId: String(periodId),
        },
      },
      select: {
        youtrackIssueId: true,
      },
      distinct: ['youtrackIssueId'],
    });

    const issueIds = lines.map((l) => l.youtrackIssueId);
    if (issueIds.length === 0) {
      return [];
    }

    // 2. Загружаем все задачи, включая родительские (чтобы построить полное дерево)
    const allIssues = await this.prisma.youTrackIssue.findMany({
      where: {
        OR: [
          { id: { in: issueIds } },
          // Также загружаем родительские задачи для построения полной иерархии
          {
            childIssues: {
              some: {
                id: { in: issueIds },
              },
            },
          },
        ],
      },
    });

    // 3. Строим маппинг issueId -> задача и собираем дочерние связи
    const issueMap = new Map<string, (typeof allIssues)[0]>();
    const childMap = new Map<string, string[]>();

    for (const issue of allIssues) {
      issueMap.set(issue.id, issue);
      if (issue.parentIssueId) {
        const children = childMap.get(issue.parentIssueId) ?? [];
        children.push(issue.id);
        childMap.set(issue.parentIssueId, children);
      }
    }

    // 4. Рекурсивно строим дерево
    const buildTree = (parentId: string | null): IssueHierarchyDto[] => {
      const children = childMap.get(parentId ?? '__root__') ?? [];
      // Если parentId === null, ищем задачи без родителя
      if (parentId === null) {
        const rootIssues = allIssues.filter((i) => !i.parentIssueId);
        return rootIssues.map((issue) => this.buildNode(issue, childMap, issueMap));
      }
      return children
        .map((childId: string) => {
          const issue = issueMap.get(childId);
          if (!issue) return null;
          return this.buildNode(issue, childMap, issueMap);
        })
        .filter((n): n is IssueHierarchyDto => n !== null);
    };

    return buildTree(null);
  }

  /**
   * Построить узел дерева рекурсивно.
   */
  private buildNode(
    issue: {
      id: string;
      youtrackId: string;
      issueNumber: string;
      summary: string;
      typeName: string | null;
      parentIssueId: string | null;
    },
    childMap: Map<string, string[]>,
    issueMap: Map<string, any>,
  ): IssueHierarchyDto {
    const childIssueIds = childMap.get(issue.id) ?? [];
    const children = childIssueIds
      .map((childId: string) => {
        const child = issueMap.get(childId);
        if (!child) return null;
        return this.buildNode(child, childMap, issueMap);
      })
      .filter((n): n is IssueHierarchyDto => n !== null);

    return {
      issueId: issue.id,
      issueNumber: issue.issueNumber,
      summary: issue.summary,
      typeName: issue.typeName,
      parentIssueId: issue.parentIssueId,
      reportIssueIds: [issue.id],
      children,
      totals: null, // totals заполняются в use case после агрегации по отчётам
    };
  }

  /**
   * Преобразовать Prisma-модель в DTO.
   */
  private toDto(issue: {
    id: string;
    youtrackId: string;
    issueNumber: string;
    summary: string;
    projectName: string | null;
    systemName: string | null;
    sprintName: string | null;
    typeName: string | null;
    parentIssueId: string | null;
    parentYtId: string | null;
    estimationMinutes: number | null;
  }): YouTrackIssueDto {
    return {
      id: issue.id,
      youtrackId: issue.youtrackId,
      issueNumber: issue.issueNumber,
      summary: issue.summary,
      projectName: issue.projectName,
      systemName: issue.systemName,
      sprintName: issue.sprintName,
      typeName: issue.typeName,
      parentIssueId: issue.parentIssueId,
      parentYtId: issue.parentYtId,
      estimationMinutes: issue.estimationMinutes,
    };
  }
}
