/**
 * GetPeriodGroupsUseCase
 *
 * Группировка финансовых данных периода по историям (issue hierarchy).
 * Формирует структуру, аналогичную buildSprintIssueGroups на фронте:
 * - Эпики → Фичи → Истории → Задачи
 * - Для каждой группы суммируются planned/actual minutes и финансовые показатели
 *
 * @todo Полная реализация требует доступа к иерархии YouTrack-задач
 *       через YouTrackIssueRepository. Пока возвращает заглушку с totals.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

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
    // TODO: добавить YouTrackIssueRepository для построения иерархии
  ) {}

  async execute(periodId: string): Promise<PeriodGroupsResult> {
    // 1. Получаем период
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем строки личных отчётов за период
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. TODO: построить иерархию задач через YouTrackIssueRepository
    //    - Загрузить все issue для данного периода
    //    - Построить дерево: Epic → Feature → Story → Task → SubTask
    //    - Сгруппировать reports по узлам дерева
    //    - Агрегировать planned/actual minutes и финансы для каждого узла

    // 4. Пока возвращаем заглушку — плоскую группировку
    return {
      periodId,
      groups: this.buildFlatGroups(reports),
      totals: this.calculateTotals(reports),
    };
  }

  /**
   * Построить плоскую группировку (заглушка).
   * TODO: заменить на построение дерева через YouTrackIssueRepository
   */
  private buildFlatGroups(reports: any[]): PeriodIssueGroup[] {
    // Группируем по issueNumber
    const grouped = new Map<string, any[]>();
    for (const report of reports) {
      const key = report.issueNumber;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(report);
    }

    const groups: PeriodIssueGroup[] = [];
    for (const [issueNumber, issueReports] of grouped.entries()) {
      const first = issueReports[0];
      const totals = this.calculateItemTotals(issueReports);
      groups.push({
        issueId: first.youtrackIssueId,
        issueNumber,
        summary: first.summary,
        type: 'TASK', // TODO: определить реальный тип из иерархии
        children: [],
        totals,
      });
    }

    return groups;
  }

  /**
   * Рассчитать агрегированные показатели для группы отчётов.
   */
  private calculateItemTotals(reports: any[]): PeriodGroupItemTotals {
    const uniqueEmployees = new Set<string>();
    let totalPlannedHours = 0;
    let totalActualHours = 0;
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
      totalPlannedHours += (report.plannedDevMinutes ?? 0) + (report.plannedTestMinutes ?? 0) + (report.plannedMgmtMinutes ?? 0);
      totalActualHours += (report.actualDevMinutes ?? 0) + (report.actualTestMinutes ?? 0) + (report.actualMgmtMinutes ?? 0);
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
      totalPlannedHours: Math.round(totalPlannedHours / 60 * 100) / 100, // минуты → часы
      totalActualHours: Math.round(totalActualHours / 60 * 100) / 100,
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
  private calculateTotals(reports: any[]): PeriodGroupsTotals {
    const totals = this.calculateItemTotals(reports);
    const reportsWithRate = reports.filter(r => r.effectiveRate != null);
    const averageEffectiveRate = reportsWithRate.length > 0
      ? Math.round(
          reportsWithRate.reduce((s, r) => s + (r.effectiveRate ?? 0), 0) /
            reportsWithRate.length *
            100,
        ) / 100
      : null;

    return {
      ...totals,
      averageEffectiveRate,
    };
  }
}
