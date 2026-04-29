/**
 * GetPeriodBySystemUseCase
 *
 * Группировка финансовых данных отчётного периода по системам (projects).
 * Каждая строка личного отчёта группируется по системе, к которой относится
 * задача (issue). Система определяется по полю systemName из YouTrackIssue.
 *
 * Используется для отчёта: сколько было потрачено в разрезе систем/проектов.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { PeriodTotalsDto } from '../dto/period-totals.dto';
import {
  IYouTrackIssueRepository,
  YOUTRACK_ISSUE_REPOSITORY,
} from '../ports/youtrack-issue-repository';

export interface GetPeriodBySystemQuery {
  periodId: string;
}

export interface SystemGroupDto {
  /** Название системы (проекта) */
  systemName: string;
  /** Количество задач в системе */
  issueCount: number;
  /** Количество сотрудников, работавших по системе */
  employeeCount: number;
  /** Запланировано минут */
  totalPlannedMinutes: number;
  /** Фактически минут */
  totalActualMinutes: number;
  /** Базовая сумма оплаты (копейки) */
  totalBaseAmount: number;
  /** Сумма с оценкой руководителя (копейки) */
  totalManagerAmount: number;
  /** Сумма с бизнес-оценкой (копейки) */
  totalBusinessAmount: number;
  /** На руки (копейки) */
  totalOnHand: number;
  /** С налогами (копейки) */
  totalWithTax: number;
}

export interface GetPeriodBySystemResponseDto {
  periodId: string;
  /** Сгруппированные данные по системам */
  groups: SystemGroupDto[];
  /** Итоговые суммы по всему периоду */
  totals: PeriodTotalsDto;
}

export class GetPeriodBySystemUseCase {
  constructor(
    private readonly periodRepo: ReportingPeriodRepository,
    private readonly personalReportRepo: PersonalReportRepository,
    private readonly issueRepo: IYouTrackIssueRepository,
  ) {}

  async execute(query: GetPeriodBySystemQuery): Promise<GetPeriodBySystemResponseDto> {
    const { periodId } = query;

    // 1. Проверяем, что период существует
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все строки личных отчётов периода
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. Получаем все задачи YouTrack, связанные с отчётами периода
    const issues = await this.issueRepo.findByPeriodId(Number(periodId));

    // Строим маппинг youtrackIssueId -> systemName
    const issueSystemMap = new Map<string, string>();
    for (const issue of issues) {
      issueSystemMap.set(issue.id, issue.systemName ?? 'UNKNOWN');
    }

    // 4. Группируем по системе
    // Для каждой группы также отслеживаем уникальных сотрудников
    const groupsMap = new Map<
      string,
      {
        dto: SystemGroupDto;
        employees: Set<string>;
      }
    >();

    for (const report of reports) {
      const systemName = issueSystemMap.get(report.youtrackIssueId) ?? 'UNKNOWN';

      let group = groupsMap.get(systemName);
      if (!group) {
        group = {
          dto: {
            systemName,
            issueCount: 0,
            employeeCount: 0,
            totalPlannedMinutes: 0,
            totalActualMinutes: 0,
            totalBaseAmount: 0,
            totalManagerAmount: 0,
            totalBusinessAmount: 0,
            totalOnHand: 0,
            totalWithTax: 0,
          },
          employees: new Set<string>(),
        };
        groupsMap.set(systemName, group);
      }

      group.dto.issueCount += 1;
      group.dto.totalPlannedMinutes += report.totalPlannedMinutes?.minutes ?? 0;
      group.dto.totalActualMinutes += report.totalActualMinutes?.minutes ?? 0;
      group.dto.totalBaseAmount += report.baseAmount?.kopecks ?? 0;
      group.dto.totalManagerAmount += report.managerAmount?.kopecks ?? 0;
      group.dto.totalBusinessAmount += report.businessAmount?.kopecks ?? 0;
      group.dto.totalOnHand += report.totalOnHand?.kopecks ?? 0;
      group.dto.totalWithTax += report.totalWithTax?.kopecks ?? 0;
      group.employees.add(report.userId);
    }

    // Обновляем employeeCount для каждой группы
    const groups = Array.from(groupsMap.values()).map((g) => ({
      ...g.dto,
      employeeCount: g.employees.size,
    }));

    // 5. Считаем общие итоги
    const totals: PeriodTotalsDto = {
      totalPlannedMinutes: reports.reduce((s, r) => s + (r.totalPlannedMinutes?.minutes ?? 0), 0),
      totalActualMinutes: reports.reduce((s, r) => s + (r.totalActualMinutes?.minutes ?? 0), 0),
      totalBaseAmount: reports.reduce((s, r) => s + (r.baseAmount?.kopecks ?? 0), 0),
      totalManagerAmount: reports.reduce((s, r) => s + (r.managerAmount?.kopecks ?? 0), 0),
      totalBusinessAmount: reports.reduce((s, r) => s + (r.businessAmount?.kopecks ?? 0), 0),
      totalOnHand: reports.reduce((s, r) => s + (r.totalOnHand?.kopecks ?? 0), 0),
      totalWithTax: reports.reduce((s, r) => s + (r.totalWithTax?.kopecks ?? 0), 0),
    };

    return {
      periodId,
      groups,
      totals,
    };
  }
}
