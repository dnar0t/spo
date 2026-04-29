/**
 * GetPeriodGroupsUseCase
 *
 * Группировка финансовых данных периода по историям (issue hierarchy).
 * Формирует структуру, аналогичную buildSprintIssueGroups на фронте:
 * - Эпики → Фичи → Истории → Задачи
 * - Для каждой группы суммируются planned/actual minutes и финансовые показатели
 *
 * Использует IYouTrackIssueRepository для построения иерархии задач
 * из parent-child связей YouTrackIssue.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { IYouTrackIssueRepository } from '../ports/youtrack-issue-repository';
import { PersonalReport } from '../../../domain/entities/personal-report.entity';

export interface PeriodGroupsResult {
  periodId: string;
  groups: PeriodIssueGroup[];
  totals: PeriodGroupsTotals;
}

export interface PeriodIssueGroup {
  /** ID задачи в YouTrack */
  issueId: string;
  /** Номер задачи (например, SPO-123) */
  issueNumber: string;
  /** Название / summary */
  summary: string;
  /** Тип узла: EPIC | FEATURE | STORY | TASK | SUBTASK */
  type: string;
  /** Дочерние группы */
  children: PeriodIssueGroup[];
  /** Суммарные показатели группы (с учётом детей) */
  totals: PeriodGroupItemTotals;
}

export interface PeriodGroupItemTotals {
  /** Количество строк личных отчётов */
  reportCount: number;
  /** Количество сотрудников */
  employeeCount: number;
  /** Запланированное время (часы) */
  totalPlannedHours: number;
  /** Фактическое время (часы) */
  totalActualHours: number;
  /** Базовая сумма (копейки) */
  totalBaseAmount: number;
  /** Сумма с оценкой руководителя (копейки) */
  totalManagerAmount: number;
  /** Сумма с бизнес-оценкой (копейки) */
  totalBusinessAmount: number;
  /** Сумма на руки (копейки) */
  totalOnHand: number;
  /** НДФЛ (копейки) */
  totalNdfl: number;
  /** Страховые взносы (копейки) */
  totalInsurance: number;
  /** Резерв отпусков (копейки) */
  totalReserveVacation: number;
  /** Итого с налогами (копейки) */
  totalWithTax: number;
}

export interface PeriodGroupsTotals extends PeriodGroupItemTotals {
  /** Средняя эффективная ставка (процент) */
  averageEffectiveRate: number | null;
}

export class GetPeriodGroupsUseCase {
  constructor(
    private readonly periodRepo: ReportingPeriodRepository,
    private readonly personalReportRepo: PersonalReportRepository,
    private readonly issueRepo: IYouTrackIssueRepository,
  ) {}

  async execute(periodId: string): Promise<PeriodGroupsResult> {
    // 1. Получаем период
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем строки личных отчётов за период
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. Получаем иерархию задач через YouTrackIssueRepository
    const hierarchy = await this.issueRepo.findHierarchyByPeriodId(Number(periodId));

    // 4. Строим маппинг youtrackIssueId -> report data
    //    В одном отчёте может быть несколько строк, группируем по issueId
    const reportByIssueId = this.groupReportsByIssueId(reports);

    // 5. Строим дерево групп с агрегированными totals
    const groups = this.buildTreeWithTotals(hierarchy, reportByIssueId);

    // 6. Считаем общие итоги
    const totals = this.calculateTotals(reports);

    return {
      periodId,
      groups,
      totals,
    };
  }

  /**
   * Сгруппировать PersonalReport по youtrackIssueId.
   */
  private groupReportsByIssueId(reports: PersonalReport[]): Map<string, PersonalReport[]> {
    const grouped = new Map<string, PersonalReport[]>();
    for (const report of reports) {
      const issueId = report.youtrackIssueId;
      if (!issueId) continue;
      const list = grouped.get(issueId) ?? [];
      list.push(report);
      grouped.set(issueId, list);
    }
    return grouped;
  }

  /**
   * Рекурсивно построить дерево групп с агрегированными totals.
   * Для каждого узла собираем:
   *   - свои отчёты (по issueId узла)
   *   - отчёты всех дочерних узлов (рекурсивно)
   */
  private buildTreeWithTotals(
    nodes: Array<{
      issueId: string;
      issueNumber: string;
      summary: string;
      typeName: string | null;
      parentIssueId: string | null;
      reportIssueIds: string[];
      children: any[];
      totals: any;
    }>,
    reportByIssueId: Map<string, PersonalReport[]>,
  ): PeriodIssueGroup[] {
    return nodes.map((node) => {
      // Рекурсивно строим дочерние узлы
      const children = this.buildTreeWithTotals(node.children, reportByIssueId);

      // Собираем все отчёты для этого узла (свои + дочерние)
      const allReports = this.collectNodeReports(node, reportByIssueId, children);

      // Вычисляем агрегированные показатели для поддерева
      const totals = this.calculateItemTotals(allReports);

      return {
        issueId: node.issueId,
        issueNumber: node.issueNumber,
        summary: node.summary,
        type: this.mapTypeName(node.typeName),
        children,
        totals,
      };
    });
  }

  /**
   * Собрать все отчёты для узла:
   *   - отчёты, соответствующие issueId самого узла
   *   - отчёты всех дочерних узлов (рекурсивно)
   */
  private collectNodeReports(
    node: {
      issueId: string;
      reportIssueIds: string[];
    },
    reportByIssueId: Map<string, PersonalReport[]>,
    children: PeriodIssueGroup[],
  ): PersonalReport[] {
    const result: PersonalReport[] = [];

    // Собираем отчёты для самого узла
    for (const issueId of node.reportIssueIds) {
      const reports = reportByIssueId.get(issueId);
      if (reports) {
        result.push(...reports);
      }
    }

    // Собираем отчёты дочерних узлов (рекурсивно)
    for (const child of children) {
      // У дочерних групп totals уже вычислены, но нам нужны сырые отчёты
      // Здесь мы полагаемся на то, что дочерние группы уже содержат все свои отчёты
      // в processNodeReports. Однако для корректного суммирования мы просто
      // собираем отчёты итеративно.
      // Используем reportByIssueId для дочерних issueId
      this.collectChildReportsRecursive(child, reportByIssueId, result);
    }

    return result;
  }

  /**
   * Рекурсивно собрать отчёты из дочерних узлов.
   */
  private collectChildReportsRecursive(
    group: PeriodIssueGroup,
    reportByIssueId: Map<string, PersonalReport[]>,
    result: PersonalReport[],
  ): void {
    const reports = reportByIssueId.get(group.issueId);
    if (reports) {
      result.push(...reports);
    }
    for (const child of group.children) {
      this.collectChildReportsRecursive(child, reportByIssueId, result);
    }
  }

  /**
   * Преобразовать typeName из YouTrack в тип узла.
   */
  private mapTypeName(typeName: string | null): string {
    if (!typeName) return 'TASK';
    const upper = typeName.toUpperCase();
    if (upper.includes('EPIC')) return 'EPIC';
    if (upper.includes('FEATURE') || upper.includes('FEATURE')) return 'FEATURE';
    if (upper.includes('STORY') || upper.includes('STORY')) return 'STORY';
    if (upper.includes('SUBTASK') || upper.includes('SUB-TASK')) return 'SUBTASK';
    return 'TASK';
  }

  /**
   * Рассчитать агрегированные показатели для группы отчётов.
   */
  private calculateItemTotals(reports: PersonalReport[]): PeriodGroupItemTotals {
    const uniqueEmployees = new Set<string>();
    let totalPlannedMinutes = 0;
    let totalActualMinutes = 0;
    let totalBaseAmount = 0;
    let totalManagerAmount = 0;
    let totalBusinessAmount = 0;
    let totalOnHand = 0;
    let totalNdfl = 0;
    let totalInsurance = 0;
    let totalReserveVacation = 0;
    let totalWithTax = 0;

    for (const report of reports) {
      uniqueEmployees.add(report.userId);
      totalPlannedMinutes += report.totalPlannedMinutes?.minutes ?? 0;
      totalActualMinutes += report.totalActualMinutes?.minutes ?? 0;
      totalBaseAmount += report.baseAmount?.kopecks ?? 0;
      totalManagerAmount += report.managerAmount?.kopecks ?? 0;
      totalBusinessAmount += report.businessAmount?.kopecks ?? 0;
      totalOnHand += report.totalOnHand?.kopecks ?? 0;
      totalNdfl += report.ndfl?.kopecks ?? 0;
      totalInsurance += report.insurance?.kopecks ?? 0;
      totalReserveVacation += report.reserveVacation?.kopecks ?? 0;
      totalWithTax += report.totalWithTax?.kopecks ?? 0;
    }

    return {
      reportCount: reports.length,
      employeeCount: uniqueEmployees.size,
      totalPlannedHours: Math.round((totalPlannedMinutes / 60) * 100) / 100,
      totalActualHours: Math.round((totalActualMinutes / 60) * 100) / 100,
      totalBaseAmount,
      totalManagerAmount,
      totalBusinessAmount,
      totalOnHand,
      totalNdfl,
      totalInsurance,
      totalReserveVacation,
      totalWithTax,
    };
  }

  /**
   * Рассчитать общие итоги по всем отчётам периода.
   */
  private calculateTotals(reports: PersonalReport[]): PeriodGroupsTotals {
    const totals = this.calculateItemTotals(reports);
    const ratesWithWeight = reports
      .filter((r) => r.effectiveRate !== null && r.baseAmount?.kopecks && r.baseAmount.kopecks > 0)
      .map((r) => ({
        rate: r.effectiveRate!,
        weight: r.baseAmount!.kopecks,
      }));
    const totalWeight = ratesWithWeight.reduce((s, r) => s + r.weight, 0);
    const averageEffectiveRate =
      totalWeight > 0
        ? Math.round(
            (ratesWithWeight.reduce((s, r) => s + r.rate * r.weight, 0) / totalWeight) * 100,
          ) / 100
        : null;

    return {
      ...totals,
      averageEffectiveRate,
    };
  }
}
