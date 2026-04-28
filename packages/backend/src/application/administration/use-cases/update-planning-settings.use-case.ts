/**
 * UpdatePlanningSettingsUseCase
 *
 * Use case для обновления настроек планирования по умолчанию.
 * Логирует действие в аудит.
 */
import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import { PlanningSettings } from '../../../domain/entities/planning-settings.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { UpdatePlanningSettingsDto } from '../dto/update-planning-settings.dto';

export class UpdatePlanningSettingsUseCase {
  constructor(
    private readonly planningSettingsRepository: PlanningSettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: UpdatePlanningSettingsDto & { updatedBy: string },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Получение текущих настроек или создание новых
    let settings = await this.planningSettingsRepository.findLatest();

    if (!settings) {
      settings = PlanningSettings.create({
        updatedBy: dto.updatedBy,
      });
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
    };

    // 4. Обновление (business rule)
    settings.update(updateParams);

    // 5. Сохранение
    await this.planningSettingsRepository.save(settings);

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
        },
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
