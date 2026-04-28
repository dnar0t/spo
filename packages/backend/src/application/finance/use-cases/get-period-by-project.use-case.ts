/**
 * GetPeriodByProjectUseCase
 *
 * Группировка финансовых данных отчётного периода по проектам.
 * Собирает все PersonalReport строки за период и группирует их
 * по идентификатору проекта (из YouTrackIssue).
 *
 * TODO: Полная реализация требует доступа к issue hierarchy через
 *       YouTrackIssueRepository для определения projectId по каждому issue.
 *       Сейчас — заглушка с возвратом общей суммы по периоду.
 */
import { PrismaReportingPeriodRepository } from '../../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

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
    private readonly periodRepo: PrismaReportingPeriodRepository,
    private readonly personalReportRepo: PrismaPersonalReportRepository,
    // TODO: добавить YouTrackIssueRepository для получения projectId по issue
    // private readonly youtrackIssueRepo: PrismaYouTrackIssueRepository,
  ) {}

  async execute(periodId: string): Promise<GetPeriodByProjectResponseDto> {
    // 1. Проверяем, что период существует
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все строки личных отчётов за период
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. Собираем уникальные issueId из отчётов
    // TODO: Получать иерархию issue через YouTrackIssueRepository,
    //       чтобы определить projectId для каждого issue.
    //       Пока используем заглушку — все задачи в одном проекте "UNKNOWN".

    const uniqueIssueIds = new Set(reports.map(r => r.youtrackIssueId));
    const uniqueUserIds = new Set(reports.map(r => r.userId));

    // 4. Формируем группы (заглушка — одна группа на весь период)
    const totalPlannedMinutes = reports.reduce(
      (sum, r) => sum + (r.totalPlannedMinutes?.minutes ?? 0), 0,
    );
    const totalActualMinutes = reports.reduce(
      (sum, r) => sum + (r.totalActualMinutes?.minutes ?? 0), 0,
    );
    const totalBaseAmount = reports.reduce(
      (sum, r) => sum + (r.baseAmount?.kopecks ?? 0), 0,
    );
    const totalManagerAmount = reports.reduce(
      (sum, r) => sum + (r.managerAmount?.kopecks ?? 0), 0,
    );
    const totalBusinessAmount = reports.reduce(
      (sum, r) => sum + (r.businessAmount?.kopecks ?? 0), 0,
    );
    const totalOnHand = reports.reduce(
      (sum, r) => sum + (r.totalOnHand?.kopecks ?? 0), 0,
    );
    const totalWithTax = reports.reduce(
      (sum, r) => sum + (r.totalWithTax?.kopecks ?? 0), 0,
    );

    const groups: ProjectGroupDto[] = [
      {
        projectId: '__all__',
        projectName: 'All Projects (stub)',
        totalPlannedMinutes,
        totalActualMinutes,
        totalBaseAmount,
        totalManagerAmount,
        totalBusinessAmount,
        totalOnHand,
        totalWithTax,
        employeeCount: uniqueUserIds.size,
        issueCount: uniqueIssueIds.size,
      },
    ];

    // TODO: Реальная группировка по projectId:
    //   - Для каждого unique issueId получить YouTrackIssue с projectId
    //   - Сгруппировать reports по projectId
    //   - Для каждой группы подсчитать суммы
    //   - Вернуть массив ProjectGroupDto

    return {
      periodId,
      groups,
      totals: {
        totalPlannedMinutes,
        totalActualMinutes,
        totalBaseAmount,
        totalManagerAmount,
        totalBusinessAmount,
        totalOnHand,
        totalWithTax,
        employeeCount: uniqueUserIds.size,
        issueCount: uniqueIssueIds.size,
      },
    };
  }
}
