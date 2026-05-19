/**
 * GetPlanningSettingsUseCase
 *
 * Use case для получения текущих настроек планирования.
 * Возвращает значения, конвертируя basis points обратно в проценты для удобства фронта.
 */
import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface PlanningSettingsResponseDto {
  id: string;
  workHoursPerMonth: number | null; // в часах (из минут)
  reservePercent: number | null; // как float (0..1), напр. 0.3 = 30% (из basis points / 10000)
  testPercent: number | null; // как float (0..1)
  debugPercent: number | null; // как float (0..1)
  mgmtPercent: number | null; // как float (0..1)
  yellowThreshold: number | null; // как float (0..1), напр. 0.8 = 80%
  redThreshold: number | null; // как float (0..1), напр. 1.0 = 100%
  businessGroupingLevel: string | null;
  month: number | null;
  year: number | null;
  updatedBy: string;
  updatedAt: string;
}

export class GetPlanningSettingsUseCase {
  constructor(private readonly planningSettingsRepository: PlanningSettingsRepository) {}

  async execute(): Promise<PlanningSettingsResponseDto> {
    const settings = await this.planningSettingsRepository.findLatest();

    if (!settings) {
      // Return defaults
      return { id: "default", workHoursPerMonth: 168, reservePercent: 0.3, testPercent: 0.2, debugPercent: 0.3, mgmtPercent: 0.1, yellowThreshold: 0.8, redThreshold: 1.0, businessGroupingLevel: "STORY", updatedBy: "system", updatedAt: new Date().toISOString() };
      // throw new NotFoundError('PlanningSettings', 'latest');
    }

    return {
      id: settings.id,
      workHoursPerMonth:
        settings.workHoursPerMonth !== null
          ? Math.round(settings.workHoursPerMonth / 60) // минуты → часы
          : null,
      reservePercent:
        settings.reservePercent !== null
          ? settings.reservePercent / 10000 // basis points → float (0..1)
          : null,
      testPercent: settings.testPercent !== null ? settings.testPercent / 10000 : null,
      debugPercent: settings.debugPercent !== null ? settings.debugPercent / 10000 : null,
      mgmtPercent: settings.mgmtPercent !== null ? settings.mgmtPercent / 10000 : null,
      yellowThreshold: settings.yellowThreshold !== null ? settings.yellowThreshold / 10000 : null,
      redThreshold: settings.redThreshold !== null ? settings.redThreshold / 10000 : null,
      businessGroupingLevel: settings.businessGroupingLevel,
      month: (settings.extensions as any)?.month ?? null,
      year: (settings.extensions as any)?.year ?? null,
      updatedBy: settings.updatedBy,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
