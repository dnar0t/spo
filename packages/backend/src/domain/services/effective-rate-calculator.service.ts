/**
 * EffectiveRateCalculator Domain Service
 *
 * Расчёт эффективной часовой ставки сотрудника с учётом:
 * - Базовой ставки (из EmployeeRate)
 * - Региональных коэффициентов
 * - Надбавок за выслугу лет, сложность и т.д.
 *
 * Используется в SalaryCalculator для определения стоимости часа работы.
 */
import { HourlyRate } from '../value-objects/hourly-rate.vo';
import { Money } from '../value-objects/money.vo';
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';
import type { EmployeeRate } from '../entities/employee-rate.entity';
import type { WorkRole } from '../entities/work-role.entity';

export interface EffectiveRateParams {
  employeeRate: EmployeeRate | null;
  workRole?: WorkRole | null;
  /** Коэффициент за выслугу лет (в basis points, 100 = 1%) */
  seniorityBonus?: Percentage | null;
  /** Региональный коэффициент (в basis points, 100 = 1%) */
  regionalCoefficient?: Percentage | null;
  /** Дата, на которую рассчитывается ставка */
  effectiveDate?: Date;
}

export interface EffectiveRateResult {
  /** Базовая часовая ставка (копеек/час) */
  baseHourlyRate: HourlyRate;
  /** Эффективная часовая ставка с учётом всех коэффициентов */
  effectiveHourlyRate: HourlyRate;
  /** Применённые мультипликаторы */
  multipliers: {
    seniorityBonus: Percentage;
    regionalCoefficient: Percentage;
    totalMultiplier: Percentage;
  };
  /** Стоимость минуты работы (копеек) */
  kopecksPerMinute: number;
}

export class EffectiveRateCalculator {
  /**
   * Рассчитать эффективную ставку на основе параметров.
   *
   * Алгоритм:
   * 1. Базовая ставка = hourlyRate из EmployeeRate
   * 2. Если ставка не задана — 0
   * 3. Мультипликаторы: (100% + seniorityBonus% + regionalCoefficient%) / 100
   * 4. effectiveRate = baseRate * totalMultiplier
   */
  calculate(params: EffectiveRateParams): EffectiveRateResult {
    const {
      employeeRate,
      seniorityBonus = Percentage.zero(),
      regionalCoefficient = Percentage.zero(),
    } = params;

    // Базовая часовая ставка
    const baseHourlyRate = employeeRate?.hourlyRate ?? HourlyRate.zero();

    // Суммарный мультипликатор
    const totalBasisPoints = Percentage.hundred().basisPoints
      + seniorityBonus.basisPoints
      + regionalCoefficient.basisPoints;

    const totalMultiplier = Percentage.fromBasisPoints(totalBasisPoints);

    // Эффективная ставка = базовая * totalMultiplier
    const effectiveKopecksPerHour = Math.round(
      baseHourlyRate.kopecksPerHour * totalMultiplier.decimal,
    );
    const effectiveHourlyRate = HourlyRate.fromKopecksPerHour(effectiveKopecksPerHour);

    return {
      baseHourlyRate,
      effectiveHourlyRate,
      multipliers: {
        seniorityBonus,
        regionalCoefficient,
        totalMultiplier,
      },
      kopecksPerMinute: effectiveHourlyRate.kopecksPerMinute,
    };
  }

  /**
   * Рассчитать стоимость N минут по эффективной ставке.
   */
  calculateCostForMinutes(effectiveRate: HourlyRate, minutes: Minutes): Money {
    const kopecks = effectiveRate.costForMinutes(minutes.minutes);
    return Money.fromKopecks(kopecks);
  }

  /**
   * Рассчитать стоимость N часов по эффективной ставке.
   */
  calculateCostForHours(effectiveRate: HourlyRate, hours: number): Money {
    const kopecks = effectiveRate.costForHours(hours);
    return Money.fromKopecks(kopecks);
  }
}
