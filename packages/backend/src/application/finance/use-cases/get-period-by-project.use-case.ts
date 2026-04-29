/**
 * GetPeriodByProjectUseCase
 *
 * Группировка финансовых данных отчётного периода по проектам.
 * Собирает все PersonalReport строки за период и группирует их
 * по идентификатору проекта (из YouTrackIssue.projectName).
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { IYouTrackIssueRepository } from '../ports/youtrack-issue-repository';

export interface ProjectGroupDto {
  readonly projectId: string;
  readonly projectName: string;
  readonly totalPlannedMinutes: number;
  readonly totalActualMinutes: number;
  readonly totalBaseAmount: number;
  readonly totalManagerAmount: number;
  readonly totalBusinessAmount: number;
  readonly totalOnHand: number;
  readonly totalWithTax: number;
  readonly employeeCount: number;
  readonly issueCount: number;
}

export interface GetPeriodByProjectResponseDto {
  readonly periodId: string;
  readonly groups: ProjectGroupDto[];
  readonly totals: {
    readonly totalPlannedMinutes: number;
    readonly totalActualMinutes: number;
    readonly totalBaseAmount: number;
    readonly totalManagerAmount: number;
    readonly totalBusinessAmount: number;
    readonly totalOnHand: number;
    readonly totalWithTax: number;
    readonly employeeCount: number;
    readonly issueCount: number;
  };
}

export class GetPeriodByProjectUseCase {
  constructor(
    private readonly periodRepo: ReportingPeriodRepository,
    private readonly personalReportRepo: PersonalReportRepository,
    private readonly issueRepo: IYouTrackIssueRepository,
  ) {}

  async execute(periodId: string): Promise<GetPeriodByProjectResponseDto> {
    // 1. Проверяем, что период существует
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все строки личных отчётов за период
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. Получаем задачи YouTrack, связанные с отчётами периода
    const issues = await this.issueRepo.findByPeriodId(Number(periodId));

    // Строим маппинг youtrackIssueId -> projectName
    const issueProjectMap = new Map<string, string>();
    for (const issue of issues) {
      const projectName = issue.projectName || issue.systemName || 'Unknown Project';
      issueProjectMap.set(issue.id, projectName);
    }

    // 4. Группируем по projectName
    const groupsMap = new Map<
      string,
      {
        projectName: string;
        employees: Set<string>;
        issueIds: Set<string>;
        totalPlannedMinutes: number;
        totalActualMinutes: number;
        totalBaseAmount: number;
        totalManagerAmount: number;
        totalBusinessAmount: number;
        totalOnHand: number;
        totalWithTax: number;
      }
    >();

    for (const report of reports) {
      const projectName = issueProjectMap.get(report.youtrackIssueId) ?? 'Unknown Project';

      let group = groupsMap.get(projectName);
      if (!group) {
        group = {
          projectName,
          employees: new Set<string>(),
          issueIds: new Set<string>(),
          totalPlannedMinutes: 0,
          totalActualMinutes: 0,
          totalBaseAmount: 0,
          totalManagerAmount: 0,
          totalBusinessAmount: 0,
          totalOnHand: 0,
          totalWithTax: 0,
        };
        groupsMap.set(projectName, group);
      }

      group.employees.add(report.userId);
      group.issueIds.add(report.youtrackIssueId);
      group.totalPlannedMinutes += report.totalPlannedMinutes?.minutes ?? 0;
      group.totalActualMinutes += report.totalActualMinutes?.minutes ?? 0;
      group.totalBaseAmount += report.baseAmount?.kopecks ?? 0;
      group.totalManagerAmount += report.managerAmount?.kopecks ?? 0;
      group.totalBusinessAmount += report.businessAmount?.kopecks ?? 0;
      group.totalOnHand += report.totalOnHand?.kopecks ?? 0;
      group.totalWithTax += report.totalWithTax?.kopecks ?? 0;
    }

    // 5. Формируем результат
    const groups: ProjectGroupDto[] = Array.from(groupsMap.values()).map((g) => ({
      projectId: g.projectName,
      projectName: g.projectName,
      totalPlannedMinutes: g.totalPlannedMinutes,
      totalActualMinutes: g.totalActualMinutes,
      totalBaseAmount: g.totalBaseAmount,
      totalManagerAmount: g.totalManagerAmount,
      totalBusinessAmount: g.totalBusinessAmount,
      totalOnHand: g.totalOnHand,
      totalWithTax: g.totalWithTax,
      employeeCount: g.employees.size,
      issueCount: g.issueIds.size,
    }));

    // Сортируем группы по projectName
    groups.sort((a, b) => a.projectName.localeCompare(b.projectName));

    // Общие итоги
    const allEmployees = new Set(reports.map((r) => r.userId));
    const allIssues = new Set(reports.map((r) => r.youtrackIssueId));

    const totals = {
      totalPlannedMinutes: groups.reduce((s, g) => s + g.totalPlannedMinutes, 0),
      totalActualMinutes: groups.reduce((s, g) => s + g.totalActualMinutes, 0),
      totalBaseAmount: groups.reduce((s, g) => s + g.totalBaseAmount, 0),
      totalManagerAmount: groups.reduce((s, g) => s + g.totalManagerAmount, 0),
      totalBusinessAmount: groups.reduce((s, g) => s + g.totalBusinessAmount, 0),
      totalOnHand: groups.reduce((s, g) => s + g.totalOnHand, 0),
      totalWithTax: groups.reduce((s, g) => s + g.totalWithTax, 0),
      employeeCount: allEmployees.size,
      issueCount: allIssues.size,
    };

    return {
      periodId,
      groups,
      totals,
    };
  }
}
