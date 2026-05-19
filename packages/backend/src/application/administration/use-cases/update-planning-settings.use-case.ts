/**
 * UpdatePlanningSettingsUseCase
 *
 * Use case для обновления настроек планирования по ID.
 * Логирует действие в аудит.
 */
import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { UpdatePlanningSettingsDto } from '../dto/update-planning-settings.dto';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class UpdatePlanningSettingsUseCase {
  constructor(
    private readonly planningSettingsRepository: PlanningSettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    id: string,
    dto: UpdatePlanningSettingsDto & { updatedBy: string },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Получение настроек по ID
    const settings = await this.planningSettingsRepository.findById(id);

    if (!settings) {
      throw new NotFoundError('PlanningSettings', id);
    }

    // 2. Конвертация человеческих единиц в system units
    const updateParams: {
      workHoursPerMonth?: number | null;
      reservePercent?: number | null;
      testPercent?: number | null;
      debugPercent?: number | null;
      mgmtPercent?: number | null;
      yellowThreshold?: number | null;
      redThreshold?: number | null;
      businessGroupingLevel?: string | null;
      extensions?: Record<string, unknown> | null;
      updatedBy: string;
    } = {
      workHoursPerMonth:
        dto.workHoursPerMonth !== undefined
          ? Math.round(dto.workHoursPerMonth * 60) // часы → минуты
          : undefined,
      reservePercent:
        dto.reservePercent !== undefined
          ? Math.round(dto.reservePercent * 10000) // float (0..1) → basis points
          : undefined,
      testPercent: dto.testPercent !== undefined ? Math.round(dto.testPercent * 10000) : undefined,
      debugPercent:
        dto.debugPercent !== undefined ? Math.round(dto.debugPercent * 10000) : undefined,
      mgmtPercent: dto.mgmtPercent !== undefined ? Math.round(dto.mgmtPercent * 10000) : undefined,
      yellowThreshold:
        dto.yellowThreshold !== undefined ? Math.round(dto.yellowThreshold * 10000) : undefined,
      redThreshold:
        dto.redThreshold !== undefined ? Math.round(dto.redThreshold * 10000) : undefined,
      businessGroupingLevel: dto.businessGroupingLevel,
      extensions:
        dto.month !== undefined || dto.year !== undefined
          ? { month: dto.month ?? null, year: dto.year ?? null }
          : undefined,
      updatedBy: dto.updatedBy,
    };

    // 3. Сохраняем старые значения для аудита
    const oldValues: Record<string, unknown> = {
      workHoursPerMonth: settings.workHoursPerMonth,
      reservePercent: settings.reservePercent,
      testPercent: settings.testPercent,
      debugPercent: settings.debugPercent,
      mgmtPercent: settings.mgmtPercent,
      yellowThreshold: settings.yellowThreshold,
      redThreshold: settings.redThreshold,
      businessGroupingLevel: settings.businessGroupingLevel,
      extensions: settings.extensions,
    };

    // 4. Обновление (business rule)
    settings.update(updateParams);

    // 5. Сохранение
    await this.planningSettingsRepository.update(settings);

    // 6. Аудит
    await this.auditLogger.log({
      userId: dto.updatedBy,
      action: 'PLANNING_SETTINGS_UPDATED',
      entityType: 'PlanningSettings',
      entityId: settings.id,
      details: {
        old: oldValues,
        new: {
          workHoursPerMonth: settings.workHoursPerMonth,
          reservePercent: settings.reservePercent,
          testPercent: settings.testPercent,
          debugPercent: settings.debugPercent,
          mgmtPercent: settings.mgmtPercent,
          yellowThreshold: settings.yellowThreshold,
          redThreshold: settings.redThreshold,
          businessGroupingLevel: settings.businessGroupingLevel,
          extensions: settings.extensions,
        },
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
