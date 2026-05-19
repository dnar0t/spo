import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';

export interface PlanningSettingsListItemDto {
  id: string;
  workHoursPerMonth: number | null;
  reservePercent: number | null;
  testPercent: number | null;
  debugPercent: number | null;
  mgmtPercent: number | null;
  yellowThreshold: number | null;
  redThreshold: number | null;
  businessGroupingLevel: string | null;
  updatedBy: string;
  month: number | null;
  year: number | null;
  updatedAt: string;
  createdAt: string;
}

export class ListPlanningSettingsUseCase {
  constructor(private readonly planningSettingsRepository: PlanningSettingsRepository) {}

  async execute(): Promise<PlanningSettingsListItemDto[]> {
    const settings = await this.planningSettingsRepository.findAll();
    return settings.map((s) => ({
      id: s.id,
      workHoursPerMonth:
        s.workHoursPerMonth !== null ? Math.round(s.workHoursPerMonth / 60) : null,
      reservePercent: s.reservePercent !== null ? s.reservePercent / 10000 : null,
      testPercent: s.testPercent !== null ? s.testPercent / 10000 : null,
      debugPercent: s.debugPercent !== null ? s.debugPercent / 10000 : null,
      mgmtPercent: s.mgmtPercent !== null ? s.mgmtPercent / 10000 : null,
      yellowThreshold: s.yellowThreshold !== null ? s.yellowThreshold / 10000 : null,
      redThreshold: s.redThreshold !== null ? s.redThreshold / 10000 : null,
      businessGroupingLevel: s.businessGroupingLevel,
      month: (s.extensions as any)?.month ?? null,
      year: (s.extensions as any)?.year ?? null,
      updatedBy: s.updatedBy,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }
}
