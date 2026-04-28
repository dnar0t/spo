/**
 * TaxCalculator Domain Service
 *
 * Расчёт налогов и отчислений с ФОТ:
 * - НДФЛ (налог на доходы физических лиц)
 * - Страховые взносы (пенсионные, медицинские, социальные)
 * - Резерв отпусков
 *
 * Все значения хранятся и возвращаются в копейках (Money VO).
 * Процентные ставки берутся из FormulaConfig (в basis points).
 */
import { Money } from '../value-objects/money.vo';
import { Percentage } from '../value-objects/percentage.vo';
import type { FormulaConfig } from '../entities/formula-config.entity';

export interface TaxCalculationParams {
  /** Сумма на руки до вычета налогов */
  totalOnHand: Money;
  /** Процент НДФЛ (в basis points, 1300 = 13%) */
  ndflPercent: Percentage;
  /** Процент страховых взносов (в basis points, 3000 = 30%) */
  insurancePercent: Percentage;
  /** Процент резерва отпусков (в basis points, 800 = 8%) */
  vacationReservePercent: Percentage;
  /** Дополнительные отчисления (произвольный список) */
  additionalDeductions?: { name: string; percent: Percentage }[];
}

export interface TaxCalculationResult {
  /** Сумма НДФЛ */
  ndfl: Money;
  /** Сумма страховых взносов */
  insurance: Money;
  /** Сумма резерва отпусков */
  vacationReserve: Money;
  /** Дополнительные отчисления */
  additionalDeductions: { name: string; amount: Money }[];
  /** Общая сумма налогов и отчислений */
  totalTaxDeductions: Money;
  /** Общая сумма с налогами (totalOnHand + totalTaxDeductions) */
  totalWithTax: Money;
}

export class TaxCalculator {
  /**
   * Рассчитать налоги и отчисления с суммы на руки.
   *
   * Алгоритм:
   * 1. НДФЛ = totalOnHand * ndflPercent
   * 2. Страховые = totalOnHand * insurancePercent
   * 3. Резерв отпусков = totalOnHand * vacationReservePercent
   * 4. Дополнительные отчисления = totalOnHand * additionalDeductionPercent
   * 5. Итого налогов = НДФЛ + страховые + резерв отпусков + дополнительные
   * 6. TotalWithTax = totalOnHand + итого налогов
   */
  calculate(params: TaxCalculationParams): TaxCalculationResult {
    const {
      totalOnHand,
      ndflPercent,
      insurancePercent,
      vacationReservePercent,
      additionalDeductions = [],
    } = params;

    // НДФЛ
    const ndfl = totalOnHand.percent(ndflPercent.basisPoints);

    // Страховые взносы
    const insurance = totalOnHand.percent(insurancePercent.basisPoints);

    // Резерв отпусков
    const vacationReserve = totalOnHand.percent(vacationReservePercent.basisPoints);

    // Дополнительные отчисления
    const additionalResults = additionalDeductions.map(d => ({
      name: d.name,
      amount: totalOnHand.percent(d.percent.basisPoints),
    }));

    // Итого налогов
    const additionalTotal = additionalResults.reduce(
      (sum, d) => sum.add(d.amount),
      Money.zero(),
    );
    const totalTaxDeductions = ndfl.add(insurance).add(vacationReserve).add(additionalTotal);

    // Итого с налогами
    const totalWithTax = totalOnHand.add(totalTaxDeductions);

    return {
      ndfl,
      insurance,
      vacationReserve,
      additionalDeductions: additionalResults,
      totalTaxDeductions,
      totalWithTax,
    };
  }

  /**
   * Извлечь проценты налогов из активных FormulaConfig.
   * Возвращает объект с процентами для каждого типа налога.
   */
  extractFormulaRates(formulas: FormulaConfig[]): {
    ndflPercent: Percentage;
    insurancePercent: Percentage;
    vacationReservePercent: Percentage;
    additional: { name: string; percent: Percentage }[];
  } {
    const ndflFormula = formulas.find(f => f.formulaType === 'NDFL' && f.isActive);
    const insuranceFormula = formulas.find(f => f.formulaType === 'INSURANCE' && f.isActive);
    const vacationFormula = formulas.find(f => f.formulaType === 'VACATION_RESERVE' && f.isActive);

    const ndflPercent = ndflFormula
      ? Percentage.fromBasisPoints(ndflFormula.value)
      : Percentage.fromPercent(13); // default 13%

    const insurancePercent = insuranceFormula
      ? Percentage.fromBasisPoints(insuranceFormula.value)
      : Percentage.fromPercent(30); // default 30%

    const vacationReservePercent = vacationFormula
      ? Percentage.fromBasisPoints(vacationFormula.value)
      : Percentage.fromPercent(8); // default 8%

    const additional = formulas
      .filter(f => f.formulaType === 'OTHER' && f.isActive)
      .map(f => ({
        name: f.name,
        percent: Percentage.fromBasisPoints(f.value),
      }));

    return {
      ndflPercent,
      insurancePercent,
      vacationReservePercent,
      additional,
    };
  }
}
