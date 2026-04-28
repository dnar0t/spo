/**
 * GetPeriodBySystemUseCase
 *
 * Группировка финансовых данных отчётного периода по системам (projects).
 * Каждая строка личного отчёта группируется по системе, к которой относится
 * задача (issue). Система определяется по префиксу issueNumber или по
 * parentIssue из иерархии YouTrack.
 *
 * Используется для отчёта: сколько было потрачено в разрезе систем/проектов.
 *
 * TODO: Полная реализация требует получения иерархии issue из
 * YouTrackIssueRepository для определения системы каждой задачи.
 * Сейчас — заглушка, возвращающая плоскую структуру без группировки.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { PeriodTotalsDto } from '../dto/period-totals.dto';

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
    // TODO: Добавить YouTrackIssueRepository для определения системы по issue
    // private readonly issueRepo: YouTrackIssueRepository,
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

    // TODO: Получаем иерархию issue из YouTrackIssueRepository
    // const issues = await this.issueRepo.findByPeriodId(periodId);
    // Строим маппинг issueId -> systemName (по префиксу issueNumber или parentIssue)

    // 3. Группируем по системе
    // Пока все строки попадают в группу "UNKNOWN"
    const groupsMap = new Map<string, SystemGroupDto>();
    const employeeSet = new Set<string>();

    for (const report of reports) {
      const systemName = 'UNKNOWN'; // TODO: определить систему issue
      employeeSet.add(report.userId);

      const existing = groupsMap.get(systemName) ?? {
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
      };

      existing.issueCount += 1;
      existing.totalPlannedMinutes += report.totalPlannedMinutes?.minutes ?? 0;
      existing.totalActualMinutes += report.totalActualMinutes?.minutes ?? 0;
      existing.totalBaseAmount += report.baseAmount?.kopecks ?? 0;
      existing.totalManagerAmount += report.managerAmount?.kopecks ?? 0;
      existing.totalBusinessAmount += report.businessAmount?.kopecks ?? 0;
      existing.totalOnHand += report.totalOnHand?.kopecks ?? 0;
      existing.totalWithTax += report.totalWithTax?.kopecks ?? 0;

      groupsMap.set(systemName, existing);
    }

    // Обновляем employeeCount для каждой группы
    // TODO: employeeCount должен считаться по уникальным userId в группе,
    // сейчас считаем глобально — это заглушка
    const uniqueEmployees = employeeSet.size;
    const groups = Array.from(groupsMap.values()).map((g) => ({
      ...g,
      employeeCount: uniqueEmployees,
    }));

    // 4. Считаем общие итоги
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
