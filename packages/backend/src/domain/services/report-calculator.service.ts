/**
 * ReportCalculator Domain Service
 *
 * Stateless сервис для расчёта отчётов: генерации строк личного и итогового
 * отчётов, расчёта статистики периода, группировки и финансовых расчётов.
 */
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';
import { PersonalReport, SalaryCalculationParams, SalaryCalculationResult } from '../entities/personal-report.entity';
import { SummaryReport } from '../entities/summary-report.entity';
import { ReportingPeriod } from '../entities/reporting-period.entity';
import { ManagerEvaluation } from '../entities/manager-evaluation.entity';
import { BusinessEvaluation } from '../entities/business-evaluation.entity';
import type { PlannedTask } from '../entities/planned-task.entity';
import type { EmployeeRate } from '../entities/employee-rate.entity';
import type { FormulaConfig } from '../entities/formula-config.entity';

export interface GeneratePersonalLinesParams {
  userId: string;
  period: ReportingPeriod;
  plannedTasks: PlannedTask[];
  workItems: { youtrackIssueId: string; durationMinutes: number; authorId?: string | null }[];
  employeeRate: EmployeeRate | null;
  managerEvaluation: ManagerEvaluation | null;
  businessEvaluation: BusinessEvaluation | null;
  formulas: FormulaConfig[];
}

export interface PeriodStatistics {
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  deviation: number;
  completionPercent: number;
  unplannedMinutes: number;
  unplannedPercent: number;
  remainingMinutes: number;
  unfinishedTasks: number;
}

export interface GroupedReport {
  systemName: string;
  plannedMinutes: number;
  actualMinutes: number;
  items: SummaryReport[];
}

export interface PeriodStatisticsResult {
  totalPlannedMinutes: Minutes;
  totalActualMinutes: Minutes;
  deviation: Minutes;
  completionPercent: Percentage;
  unplannedMinutes: Minutes;
  unplannedPercent: Percentage;
  remainingMinutes: Minutes;
  unfinishedTasks: number;
}

export class ReportCalculator {
  /**
   * Генерация строк личного отчёта из запланированных задач и фактических work items.
   *
   * Для каждой задачи:
   * 1. Находит соответствующие work items по youtrackIssueId и автору
   * 2. Суммирует фактическое время
   * 3. Применяет оценки руководителя и бизнеса (если есть)
   * 4. Рассчитывает финансовые показатели
   */
  generatePersonalLines(params: GeneratePersonalLinesParams): PersonalReport[] {
    const { userId, period, plannedTasks, workItems, employeeRate, managerEvaluation, businessEvaluation, formulas } = params;

    // Извлекаем формулы
    const ndflFormula = formulas.find(f => f.formulaType === 'NDFL' && f.isActive);
    const insuranceFormula = formulas.find(f => f.formulaType === 'INSURANCE' && f.isActive);
    const vacationReserveFormula = formulas.find(f => f.formulaType === 'VACATION_RESERVE' && f.isActive);

    const ndflPercent = ndflFormula ? Percentage.fromBasisPoints(ndflFormula.value) : Percentage.fromPercent(13);
    const insurancePercent = insuranceFormula ? Percentage.fromBasisPoints(insuranceFormula.value) : Percentage.fromPercent(30);
    const vacationReservePercent = vacationReserveFormula ? Percentage.fromBasisPoints(vacationReserveFormula.value) : Percentage.fromPercent(8);

    // Часовая ставка в копейках за минуту
    const hourlyRate = employeeRate?.hourlyRate ?? null;

    return plannedTasks.map((task, index) => {
      // Фактические трудозатраты по задаче от этого пользователя
      const actualWorkItems = workItems.filter(
        wi => wi.youtrackIssueId === task.youtrackIssueId && (!wi.authorId || wi.authorId === userId),
      );
      const totalActualMinutes = actualWorkItems.reduce((sum, wi) => sum + wi.durationMinutes, 0);

      // Базовый расчёт: plannedHours = estimation
      const plannedMinutes = task.estimationMinutes?.minutes ?? task.totalPlannedMinutes.minutes ?? 0;
      const actualMinutes = totalActualMinutes;
      const remainingMinutes = Math.max(0, plannedMinutes - actualMinutes);

      // Базовая сумма = часы * ставка
      const baseAmount = hourlyRate !== null && plannedMinutes > 0
        ? Money.fromKopecks(Math.round(plannedMinutes * hourlyRate))
        : Money.zero();

      // Проценты оценок
      const managerPct = managerEvaluation?.percent ?? null;
      const businessPct = businessEvaluation?.percent ?? null;

      // Расчёт зарплаты
      const salaryResult = this.calculateSalary({
        baseAmount,
        managerPercent: managerPct ?? Percentage.zero(),
        businessPercent: businessPct ?? Percentage.zero(),
        ndflPercent,
        insurancePercent,
        vacationReservePercent,
      });

      return PersonalReport.create({
        periodId: period.id,
        userId,
        youtrackIssueId: task.youtrackIssueId ?? task.issueNumber,
        issueNumber: task.issueNumber,
        summary: task.summary,
        stateName: null,
        parentIssueNumber: task.parentIssueNumber,
        parentIssueId: task.parentIssueId,
        estimationMinutes: task.estimationMinutes,
        actualMinutes: Minutes.fromMinutes(actualMinutes),
        isPlanned: task.isPlanned,
        readinessPercent: task.readinessPercent,
        plannedDevMinutes: task.plannedDevMinutes,
        plannedTestMinutes: task.plannedTestMinutes,
        plannedMgmtMinutes: task.plannedMgmtMinutes,
        actualDevMinutes: Minutes.fromMinutes(actualMinutes),
        actualTestMinutes: Minutes.zero(),
        actualMgmtMinutes: Minutes.zero(),
        remainingMinutes: Minutes.fromMinutes(remainingMinutes),
        baseAmount,
        managerEvaluationType: managerEvaluation?.evaluationType ?? null,
        managerPercent: managerPct ?? null,
        managerAmount: salaryResult.managerAmount,
        businessEvaluationType: businessEvaluation?.evaluationType ?? null,
        businessPercent: businessPct ?? null,
        businessAmount: salaryResult.businessAmount,
        totalOnHand: salaryResult.totalOnHand,
        ndfl: salaryResult.ndfl,
        insurance: salaryResult.insurance,
        reserveVacation: salaryResult.reserveVacation,
        totalWithTax: salaryResult.totalWithTax,
        effectiveRate: hourlyRate,
        sortOrder: task.sortOrder,
      });
    });
  }

  /**
   * Генерация строк итогового отчёта из строк личных отчётов.
   * Агрегирует данные по каждой задаче.
   */
  generateSummaryLines(params: {
    period: ReportingPeriod;
    personalReports: PersonalReport[];
    groupByLevel: string;
  }): SummaryReport[] {
    const { period, personalReports, groupByLevel } = params;

    // Группируем personal reports по youtrackIssueId
    const issueMap = new Map<string, PersonalReport[]>();
    for (const report of personalReports) {
      const key = report.youtrackIssueId;
      const existing = issueMap.get(key) ?? [];
      existing.push(report);
      issueMap.set(key, existing);
    }

    const summaries: SummaryReport[] = [];
    for (const [, reports] of issueMap) {
      const first = reports[0];

      // Суммируем время по всем сотрудникам на одной задаче
      const totalPlannedDev = reports.reduce((sum, r) => sum + (r.plannedDevMinutes?.minutes ?? 0), 0);
      const totalPlannedTest = reports.reduce((sum, r) => sum + (r.plannedTestMinutes?.minutes ?? 0), 0);
      const totalPlannedMgmt = reports.reduce((sum, r) => sum + (r.plannedMgmtMinutes?.minutes ?? 0), 0);
      const totalActualDev = reports.reduce((sum, r) => sum + (r.actualDevMinutes?.minutes ?? 0), 0);
      const totalActualTest = reports.reduce((sum, r) => sum + (r.actualTestMinutes?.minutes ?? 0), 0);
      const totalActualMgmt = reports.reduce((sum, r) => sum + (r.actualMgmtMinutes?.minutes ?? 0), 0);
      const totalPlannedCost = reports.reduce((sum, r) => sum + (r.baseAmount?.kopecks ?? 0), 0);
      const totalActualCost = Math.round(totalPlannedCost * (totalActualDev + totalActualTest + totalActualMgmt) /
        Math.max(1, totalPlannedDev + totalPlannedTest + totalPlannedMgmt));
      const totalRemainingMinutes = Math.max(0,
        (totalPlannedDev + totalPlannedTest + totalPlannedMgmt) -
        (totalActualDev + totalActualTest + totalActualMgmt),
      );

      summaries.push(SummaryReport.create({
        periodId: period.id,
        systemName: null,
        projectName: null,
        groupLevel: groupByLevel,
        groupKey: null,
        issueNumber: first.issueNumber,
        summary: first.summary,
        typeName: null,
        priorityName: null,
        stateName: first.stateName,
        assigneeId: null,
        assigneeName: null,
        isPlanned: first.isPlanned,
        readinessPercent: first.readinessPercent,
        plannedDevMinutes: Minutes.fromMinutes(totalPlannedDev),
        plannedTestMinutes: Minutes.fromMinutes(totalPlannedTest),
        plannedMgmtMinutes: Minutes.fromMinutes(totalPlannedMgmt),
        actualDevMinutes: Minutes.fromMinutes(totalActualDev),
        actualTestMinutes: Minutes.fromMinutes(totalActualTest),
        actualMgmtMinutes: Minutes.fromMinutes(totalActualMgmt),
        remainingMinutes: Minutes.fromMinutes(totalRemainingMinutes),
        plannedCost: Money.fromKopecks(totalPlannedCost),
        actualCost: Money.fromKopecks(totalActualCost),
        remainingCost: totalRemainingMinutes > 0 && totalPlannedDev > 0
          ? Money.fromKopecks(Math.round(totalPlannedCost * totalRemainingMinutes / totalPlannedDev))
          : Money.zero(),
        businessEvaluationType: first.businessEvaluationType,
        managerEvaluationType: first.managerEvaluationType,
        managerComment: null,
      }));
    }

    return summaries;
  }

  /**
   * Расчёт статистики периода на основе строк итогового отчёта.
   */
  calculateStatistics(lines: SummaryReport[]): PeriodStatisticsResult {
    const totalPlannedMinutes = lines.reduce(
      (sum, l) => sum + l.totalPlannedMinutes.minutes, 0,
    );
    const totalActualMinutes = lines.reduce(
      (sum, l) => sum + l.totalActualMinutes.minutes, 0,
    );
    const deviation = totalActualMinutes - totalPlannedMinutes;
    const remainingMinutes = lines.reduce(
      (sum, l) => sum + (l.remainingMinutes?.minutes ?? 0), 0,
    );
    const unfinishedTasks = lines.filter(l => {
      const remaining = l.remainingMinutes?.minutes ?? 0;
      return remaining > 0;
    }).length;
    const unplannedLines = lines.filter(l => !l.isPlanned);
    const unplannedMinutes = unplannedLines.reduce(
      (sum, l) => sum + l.totalActualMinutes.minutes, 0,
    );

    const completionPercent = totalPlannedMinutes > 0
      ? Percentage.calculatePercentage(totalActualMinutes, totalPlannedMinutes)
      : Percentage.zero();
    const unplannedPercent = totalActualMinutes > 0
      ? Percentage.calculatePercentage(unplannedMinutes, totalActualMinutes)
      : Percentage.zero();

    return {
      totalPlannedMinutes: Minutes.fromMinutes(totalPlannedMinutes),
      totalActualMinutes: Minutes.fromMinutes(totalActualMinutes),
      deviation: Minutes.fromMinutes(deviation),
      completionPercent,
      unplannedMinutes: Minutes.fromMinutes(unplannedMinutes),
      unplannedPercent,
      remainingMinutes: Minutes.fromMinutes(remainingMinutes),
      unfinishedTasks,
    };
  }

  /**
   * Группировка отчёта по системе/проекту/уровню.
   */
  groupReport(lines: SummaryReport[], groupBy: string): GroupedReport[] {
    const groups = new Map<string, GroupedReport>();

    for (const line of lines) {
      let groupKey: string;
      switch (groupBy) {
        case 'SYSTEM':
          groupKey = line.systemName ?? 'Без системы';
          break;
        case 'PROJECT':
          groupKey = line.projectName ?? 'Без проекта';
          break;
        case 'STORY':
          groupKey = line.groupKey ?? line.issueNumber;
          break;
        default:
          groupKey = line.systemName ?? 'Без системы';
      }

      const existing = groups.get(groupKey) ?? {
        systemName: groupKey,
        plannedMinutes: 0,
        actualMinutes: 0,
        items: [],
      };

      existing.plannedMinutes += line.totalPlannedMinutes.minutes;
      existing.actualMinutes += line.totalActualMinutes.minutes;
      existing.items.push(line);
      groups.set(groupKey, existing);
    }

    return Array.from(groups.values());
  }

  /**
   * Расчёт зарплаты и налогов для строки личного отчёта.
   *
   * Алгоритм:
   * 1. Базовая сумма (baseAmount) — часы * ставка
   * 2. Надбавка руководителя = baseAmount * managerPercent
   * 3. Надбавка бизнеса = baseAmount * businessPercent
   * 4. TotalOnHand = baseAmount + managerAmount + businessAmount
   * 5. НДФЛ = TotalOnHand * ndflPercent
   * 6. Страховые взносы = TotalOnHand * insurancePercent
   * 7. Резерв отпусков = TotalOnHand * vacationReservePercent
   * 8. TotalWithTax = TotalOnHand + ndfl + insurance + reserveVacation
   */
  calculateSalary(params: {
    baseAmount: Money;
    managerPercent: Percentage;
    businessPercent: Percentage;
    ndflPercent: Percentage;
    insurancePercent: Percentage;
    vacationReservePercent: Percentage;
  }): SalaryCalculationResult {
    const { baseAmount, managerPercent, businessPercent, ndflPercent, insurancePercent, vacationReservePercent } = params;

    const managerAmount = baseAmount.percent(managerPercent.basisPoints);
    const businessAmount = baseAmount.percent(businessPercent.basisPoints);
    const totalOnHand = baseAmount.add(managerAmount).add(businessAmount);

    const ndfl = totalOnHand.percent(ndflPercent.basisPoints);
    const insurance = totalOnHand.percent(insurancePercent.basisPoints);
    const reserveVacation = totalOnHand.percent(vacationReservePercent.basisPoints);
    const totalWithTax = totalOnHand.add(ndfl).add(insurance).add(reserveVacation);

    return {
      managerAmount,
      businessAmount,
      totalOnHand,
      ndfl,
      insurance,
      reserveVacation,
      totalWithTax,
    };
  }
}
