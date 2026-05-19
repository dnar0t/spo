import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeletePlanningSettingsUseCase {
  constructor(
    private readonly planningSettingsRepository: PlanningSettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: { id: string; updatedBy: string },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const settings = await this.planningSettingsRepository.findById(dto.id);

    if (!settings) {
      throw new NotFoundError('PlanningSettings', dto.id);
    }

    await this.planningSettingsRepository.delete(dto.id);

    await this.auditLogger.log({
      userId: dto.updatedBy,
      action: 'PLANNING_SETTINGS_DELETED',
      entityType: 'PlanningSettings',
      entityId: dto.id,
      details: { deleted: true },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
