/**
 * CostCalculator Domain Service
 *
 * Расчёт стоимости трудозатрат по задачам и отчётам:
 * - Planned cost — плановая стоимость на основе запланированных часов и ставки
 * - Actual cost — фактическая стоимость на основе фактических часов и ставки
 * - Remaining cost — оставшаяся стоимость с учётом выполнения
 *
 * Используется в PersonalReport и SummaryReport для финансовых колонок.
 */
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { HourlyRate } from '../value-objects/hourly-rate.vo';
import type { Percentage } from '../value-objects/percentage.vo';
import { EffectiveRateCalculator } from './effective-rate-calculator.service';

export interface PlannedCostParams {
  plannedDevMinutes: Minutes;
  plannedTestMinutes: Minutes;
  plannedMgmtMinutes: Minutes;
  effectiveRate: HourlyRate;
}

export interface ActualCostParams {
  actualDevMinutes: Minutes;
  actualTestMinutes: Minutes;
  actualMgmtMinutes: Minutes;
  effectiveRate: HourlyRate;
}

export interface CostBreakdown {
  dev: Money;
  test: Money;
  mgmt: Money;
  total: Money;
}

export interface RemainingCostParams {
  plannedCost: Money;
  actualCost: Money;
  completionPercent: Percentage;
  remainingMinutes: Minutes;
  effectiveRate: HourlyRate;
}

export interface RemainingCostResult {
  /** Оставшаяся стоимость по плану (planned - actual) */
  remainingByPlan: Money;
  /** Оставшаяся стоимость с учётом оставшихся часов */
  remainingByHours: Money;
  /** Финальная оценка remaining cost (максимум из двух) */
  remainingCost: Money;
}

export class CostCalculator {
  constructor(private readonly effectiveRateCalculator: EffectiveRateCalculator) {}

  /**
   * Рассчитать плановую стоимость.
   *
   * Алгоритм:
   * 1. devCost = plannedDevMinutes * effectiveRate
   * 2. testCost = plannedTestMinutes * effectiveRate
   * 3. mgmtCost = plannedMgmtMinutes * effectiveRate
   * 4. total = devCost + testCost + mgmtCost
   */
  calculatePlannedCost(params: PlannedCostParams): CostBreakdown {
    const { plannedDevMinutes, plannedTestMinutes, plannedMgmtMinutes, effectiveRate } = params;

    const dev = this.calculateCost(effectiveRate, plannedDevMinutes);
    const test = this.calculateCost(effectiveRate, plannedTestMinutes);
    const mgmt = this.calculateCost(effectiveRate, plannedMgmtMinutes);

    return {
      dev,
      test,
      mgmt,
      total: dev.add(test).add(mgmt),
    };
  }

  /**
   * Рассчитать фактическую стоимость.
   *
   * Алгоритм:
   * 1. devCost = actualDevMinutes * effectiveRate
   * 2. testCost = actualTestMinutes * effectiveRate
   * 3. mgmtCost = actualMgmtMinutes * effectiveRate
   * 4. total = devCost + testCost + mgmtCost
   */
  calculateActualCost(params: ActualCostParams): CostBreakdown {
    const { actualDevMinutes, actualTestMinutes, actualMgmtMinutes, effectiveRate } = params;

    const dev = this.calculateCost(effectiveRate, actualDevMinutes);
    const test = this.calculateCost(effectiveRate, actualTestMinutes);
    const mgmt = this.calculateCost(effectiveRate, actualMgmtMinutes);

    return {
      dev,
      test,
      mgmt,
      total: dev.add(test).add(mgmt),
    };
  }

  /**
   * Рассчитать оставшуюся стоимость.
   *
   * Алгоритм:
   * 1. remainingByPlan = max(0, plannedCost - actualCost)
   * 2. remainingByHours = remainingMinutes * effectiveRate
   * 3. remainingCost = max(remainingByPlan, remainingByHours)
   */
  calculateRemainingCost(params: RemainingCostParams): RemainingCostResult {
    const { plannedCost, actualCost, remainingMinutes, effectiveRate } = params;

    const remainingByPlan = plannedCost.subtract(actualCost);
    const remainingByPlanClamped = remainingByPlan.isPositive ? remainingByPlan : Money.zero();

    const remainingByHours = this.calculateCost(effectiveRate, remainingMinutes);

    const remainingCost = remainingByPlanClamped.greaterThan(remainingByHours)
      ? remainingByPlanClamped
      : remainingByHours;

    return {
      remainingByPlan: remainingByPlanClamped,
      remainingByHours,
      remainingCost,
    };
  }

  /**
   * Вспомогательный метод: стоимость минут по ставке.
   */
  private calculateCost(rate: HourlyRate, minutes: Minutes): Money {
    const kopecks = rate.costForMinutes(minutes.minutes);
    return Money.fromKopecks(kopecks);
  }
}
