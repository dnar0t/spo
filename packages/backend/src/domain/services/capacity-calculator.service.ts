/**
 * CapacityCalculator Domain Service
 *
 * Рассчитывает доступную мощность (capacity) сотрудников на основе
 * нормы рабочих часов, резерва и уже запланированного времени.
 *
 * Определяет зоны загрузки:
 * - GREEN:  нагрузка ниже жёлтого порога
 * - YELLOW: нагрузка между жёлтым и красным порогами
 * - RED:    нагрузка равна или превышает красный порог
 */
import { Minutes } from '../value-objects/minutes.vo';
import { Percentage } from '../value-objects/percentage.vo';

export type LoadZone = 'GREEN' | 'YELLOW' | 'RED';

export interface CapacityCalculationParams {
  employeeId: string;
  workHoursPerMonth: number; // в часах
  reservePercent: Percentage;
  plannedMinutes: Minutes; // уже запланированные минуты
}

export interface CapacityCalculationResult {
  availableMinutes: Minutes;
  loadPercent: Percentage;
  loadZone: LoadZone;
}

export class CapacityCalculator {
  /**
   * Рассчитать доступную мощность сотрудника.
   *
   * 1. Переводит норму рабочих часов в минуты
   * 2. Вычитает резерв из raw-доступного времени
   * 3. Вычисляет процент загрузки (planned / available)
   * 4. Определяет зону загрузки по порогам (по умолчанию 80% / 100%)
   */
  calculate(
    params: CapacityCalculationParams,
    yellowThreshold: Percentage = Percentage.fromPercent(80),
    redThreshold: Percentage = Percentage.fromPercent(100),
  ): CapacityCalculationResult {
    const rawAvailableMinutes = Minutes.fromHours(params.workHoursPerMonth);
    const availableMinutes = this.calculateReserve(rawAvailableMinutes, params.reservePercent);
    const loadPercent = Percentage.calculatePercentage(
      params.plannedMinutes.minutes,
      availableMinutes.minutes,
    );
    const loadZone = this.determineLoadZone(loadPercent, yellowThreshold, redThreshold);

    return {
      availableMinutes,
      loadPercent,
      loadZone,
    };
  }

  /**
   * Рассчитать резервное время.
   * Из «сырого» доступного времени вычитается процент резерва.
   *
   * @example
   * rawAvailableMinutes = 10080 (168 часов)
   * reservePercent = 20% (2000 basis points)
   * Результат: 8064 минут (134.4 часа)
   */
  calculateReserve(rawAvailableMinutes: Minutes, reservePercent: Percentage): Minutes {
    const reserveMinutes = rawAvailableMinutes.percent(reservePercent.basisPoints);
    return rawAvailableMinutes.subtract(reserveMinutes);
  }

  /**
   * Определить зону загрузки на основе процента загрузки и порогов.
   *
   * Правила:
   * - GREEN:  loadPercent < yellowThreshold
   * - YELLOW: yellowThreshold <= loadPercent < redThreshold
   * - RED:    loadPercent >= redThreshold
   *
   * Если процент превышает 100%, зона всё равно RED.
   */
  determineLoadZone(
    loadPercent: Percentage,
    yellowThreshold: Percentage,
    redThreshold: Percentage,
  ): LoadZone {
    if (loadPercent.greaterThanOrEqual(redThreshold)) {
      return 'RED';
    }
    if (loadPercent.greaterThanOrEqual(yellowThreshold)) {
      return 'YELLOW';
    }
    return 'GREEN';
  }
}
