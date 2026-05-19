import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { PlanningSettings } from '../../../domain/entities/planning-settings.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';

export class CreatePlanningSettingsUseCase {
  constructor(
    private readonly planningSettingsRepository: PlanningSettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: {
      workHoursPerMonth?: number;
      reservePercent?: number;
      testPercent?: number;
      debugPercent?: number;
      mgmtPercent?: number;
      yellowThreshold?: number;
      redThreshold?: number;
      businessGroupingLevel?: string;
      month?: number;
      year?: number;
      updatedBy: string;
    },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ id: string }> {
    const extensions: Record<string, unknown> | null =
      dto.month !== undefined || dto.year !== undefined
        ? { month: dto.month ?? null, year: dto.year ?? null }
        : null;

    const settings = PlanningSettings.create({
      updatedBy: dto.updatedBy,
      workHoursPerMonth:
        dto.workHoursPerMonth !== undefined
          ? Math.round(dto.workHoursPerMonth * 60)
          : undefined,
      reservePercent:
        dto.reservePercent !== undefined
          ? Math.round(dto.reservePercent * 10000)
          : undefined,
      testPercent:
        dto.testPercent !== undefined ? Math.round(dto.testPercent * 10000) : undefined,
      debugPercent:
        dto.debugPercent !== undefined ? Math.round(dto.debugPercent * 10000) : undefined,
      mgmtPercent:
        dto.mgmtPercent !== undefined ? Math.round(dto.mgmtPercent * 10000) : undefined,
      yellowThreshold:
        dto.yellowThreshold !== undefined
          ? Math.round(dto.yellowThreshold * 10000)
          : undefined,
      redThreshold:
        dto.redThreshold !== undefined ? Math.round(dto.redThreshold * 10000) : undefined,
      businessGroupingLevel: dto.businessGroupingLevel,
      extensions,
    });

    await this.planningSettingsRepository.save(settings);

    await this.auditLogger.log({
      userId: dto.updatedBy,
      action: 'PLANNING_SETTINGS_CREATED',
      entityType: 'PlanningSettings',
      entityId: settings.id,
      details: { created: true },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { id: settings.id };
  }
}
