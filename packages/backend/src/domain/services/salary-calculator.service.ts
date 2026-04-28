/**
 * SalaryCalculator Domain Service
 *
 * Комплексный расчёт зарплаты для строки личного отчёта:
 * 1. Получает эффективную ставку через EffectiveRateCalculator
 * 2. Рассчитывает базовую сумму (часы * ставка)
 * 3. Применяет надбавки руководителя и бизнеса
 * 4. Рассчитывает налоги через TaxCalculator
 *
 * Это основной сервис для финансового расчёта personal report.
 */
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';
import { HourlyRate } from '../value-objects/hourly-rate.vo';
import { EffectiveRateCalculator } from './effective-rate-calculator.service';
import { TaxCalculator } from './tax-calculator.service';
import { CostCalculator } from './cost-calculator.service';
import type { EmployeeRate } from '../entities/employee-rate.entity';
import type { FormulaConfig } from '../entities/formula-config.entity';
import type { WorkRole } from '../entities/work-role.entity';
import type { SalaryCalculationResult } from '../entities/personal-report.entity';

export interface SalaryCalculatorParams {
  /** Эффективная ставка сотрудника (можно передать готовую или рассчитать из employeeRate) */
  employeeRate: EmployeeRate | null;
  effectiveRate?: HourlyRate;
  workRole?: WorkRole | null;
  /** Запланированные минуты по задаче (по типам работ) */
  plannedDevMinutes: Minutes;
  plannedTestMinutes: Minutes;
  plannedMgmtMinutes: Minutes;
  /** Проценты оценок (в basis points) */
  managerPercent: Percentage;
  businessPercent: Percentage;
  /** Формулы для налогов (FormulaConfig[]) */
  formulas: FormulaConfig[];
  /** Дополнительные мультипликаторы ставки */
  seniorityBonus?: Percentage;
  regionalCoefficient?: Percentage;
}

export interface SalaryCalculatorResult extends SalaryCalculationResult {
  /** Базовая сумма (часы * ставка) */
  baseAmount: Money;
  /** Надбавка руководителя */
  managerAmount: Money;
  /** Надбавка бизнеса */
  businessAmount: Money;
  /** На руки */
  totalOnHand: Money;
  /** НДФЛ */
  ndfl: Money;
  /** Страховые */
  insurance: Money;
  /** Резерв отпусков */
  reserveVacation: Money;
  /** Итого с налогами */
  totalWithTax: Money;
  /** Эффективная ставка (копеек/час) */
  effectiveRateKopecks: number;
}

export class SalaryCalculator {
  constructor(
    private readonly effectiveRateCalculator: EffectiveRateCalculator,
    private readonly taxCalculator: TaxCalculator,
    private readonly costCalculator: CostCalculator,
  ) {}

  /**
   * Полный расчёт зарплаты для строки личного отчёта.
   */
  calculate(params: SalaryCalculatorParams): SalaryCalculatorResult {
    const {
      employeeRate,
      effectiveRate: providedRate,
      workRole,
      plannedDevMinutes,
      plannedTestMinutes,
      plannedMgmtMinutes,
      managerPercent,
      businessPercent,
      formulas,
      seniorityBonus,
      regionalCoefficient,
    } = params;

    // 1. Рассчитываем эффективную ставку
    const effectiveRate =
      providedRate ??
      this.calculateEffectiveRate({
        employeeRate,
        workRole,
        seniorityBonus,
        regionalCoefficient,
      });

    // 2. Базовая сумма = все плановые часы * ставка
    const totalPlannedMinutes = plannedDevMinutes.add(plannedTestMinutes).add(plannedMgmtMinutes);

    const baseAmount = totalPlannedMinutes.isZero
      ? Money.zero()
      : Money.fromKopecks(effectiveRate.costForMinutes(totalPlannedMinutes.minutes));

    // 3. Надбавки
    const managerAmount = baseAmount.percent(managerPercent.basisPoints);
    const businessAmount = baseAmount.percent(businessPercent.basisPoints);

    // 4. Total на руки
    const totalOnHand = baseAmount.add(managerAmount).add(businessAmount);

    // 5. Налоги
    const formulaRates = this.taxCalculator.extractFormulaRates(formulas);

    const taxResult = this.taxCalculator.calculate({
      totalOnHand,
      ndflPercent: formulaRates.ndflPercent,
      insurancePercent: formulaRates.insurancePercent,
      vacationReservePercent: formulaRates.vacationReservePercent,
      additionalDeductions: formulaRates.additional,
    });

    return {
      baseAmount,
      managerAmount,
      businessAmount,
      totalOnHand,
      ndfl: taxResult.ndfl,
      insurance: taxResult.insurance,
      reserveVacation: taxResult.vacationReserve,
      totalWithTax: taxResult.totalWithTax,
      effectiveRateKopecks: effectiveRate.kopecksPerHour,
    };
  }

  /**
   * Рассчитать эффективную ставку через EffectiveRateCalculator.
   */
  private calculateEffectiveRate(params: {
    employeeRate: EmployeeRate | null;
    workRole?: WorkRole | null;
    seniorityBonus?: Percentage;
    regionalCoefficient?: Percentage;
  }): HourlyRate {
    const result = this.effectiveRateCalculator.calculate({
      employeeRate: params.employeeRate,
      workRole: params.workRole ?? null,
      seniorityBonus: params.seniorityBonus ?? Percentage.zero(),
      regionalCoefficient: params.regionalCoefficient ?? Percentage.zero(),
    });

    return result.effectiveHourlyRate;
  }
}
