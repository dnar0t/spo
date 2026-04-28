/**
 * Domain Services Barrel Export
 *
 * Экспорты всех сервисов доменного слоя.
 */
export { AccessControlService } from './access-control.service';
export { AuthDomainService } from './auth.service';
export { CapacityCalculator } from './capacity-calculator.service';
export { ReportCalculator } from './report-calculator.service';
export { EffectiveRateCalculator } from './effective-rate-calculator.service';
export { TaxCalculator } from './tax-calculator.service';
export { CostCalculator } from './cost-calculator.service';
export { SalaryCalculator } from './salary-calculator.service';
export type {
  CapacityCalculationParams,
  CapacityCalculationResult,
  LoadZone,
} from './capacity-calculator.service';
export type { EffectiveRateParams, EffectiveRateResult } from './effective-rate-calculator.service';
export type { TaxCalculationParams, TaxCalculationResult } from './tax-calculator.service';
export type {
  PlannedCostParams,
  ActualCostParams,
  CostBreakdown,
  RemainingCostParams,
  RemainingCostResult,
} from './cost-calculator.service';
export type { SalaryCalculatorParams, SalaryCalculatorResult } from './salary-calculator.service';
