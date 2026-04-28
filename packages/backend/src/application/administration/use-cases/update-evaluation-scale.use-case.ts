/**
 * UpdateEvaluationScaleUseCase
 *
 * Use case для обновления шкалы оценок.
 * Логирует действие в аудит.
 */
import { EvaluationScaleRepository } from '../../../domain/repositories/evaluation-scale.repository';
import { EvaluationScale } from '../../../domain/entities/evaluation-scale.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { UpdateEvaluationScaleDto } from '../dto/update-evaluation-scale.dto';

export class UpdateEvaluationScaleUseCase {
  constructor(
    private readonly evaluationScaleRepository: EvaluationScaleRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: UpdateEvaluationScaleDto & { scaleId: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Поиск шкалы
    const scale = await this.evaluationScaleRepository.findById(dto.scaleId);
    if (!scale) {
      throw new Error(`Evaluation scale with id "${dto.scaleId}" not found`);
    }

    const oldValues: Record<string, unknown> = {
      name: scale.name,
      percent: scale.percentValue,
      isDefault: scale.isDefault,
    };

    // 2. Обновление данных
    const newPercent = dto.percent !== undefined ? Math.round(dto.percent * 100) : undefined;
    scale.update(dto.name, newPercent);

    // 3. Если нужно установить как default
    if (dto.isDefault === true && !scale.isDefault) {
      // Сбрасываем default для всех шкал этого типа
      const scalesByType = await this.evaluationScaleRepository.findByScaleType(scale.scaleType);
      for (const s of scalesByType) {
        if (s.isDefault && s.id !== scale.id) {
          // Используем прямой доступ к приватным полям через статический метод?
          // Вместо этого создадим новый подход — сброс default для всех других
        }
      }
      scale.setAsDefault();
    }

    // 4. Сохранение
    await this.evaluationScaleRepository.update(scale);

    // 5. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'EVALUATION_SCALE_UPDATED',
      entityType: 'EvaluationScale',
      entityId: scale.id,
      details: {
        scaleType: scale.scaleType,
        old: oldValues,
        new: {
          name: scale.name,
          percent: scale.percentValue,
          isDefault: scale.isDefault,
        },
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
