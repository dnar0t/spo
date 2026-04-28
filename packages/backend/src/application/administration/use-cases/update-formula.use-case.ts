/**
 * UpdateFormulaUseCase
 *
 * Use case для обновления значения формулы.
 * Создаёт новую версию формулы и логирует действие в аудит.
 */
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { FormulaConfig } from '../../../domain/entities/formula-config.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { UpdateFormulaDto } from '../dto/update-formula.dto';
import { FormulaResponseDto } from '../dto/formula-response.dto';

export class UpdateFormulaUseCase {
  constructor(
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: UpdateFormulaDto & { formulaId: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<FormulaResponseDto> {
    // 1. Поиск формулы
    const formula = await this.formulaConfigRepository.findById(dto.formulaId);
    if (!formula) {
      throw new Error(`Formula with id "${dto.formulaId}" not found`);
    }

    // 2. Конвертация процентов в basis points (0-100 → 0-10000)
    const newValueBasisPoints = Math.round(dto.value * 100);

    if (newValueBasisPoints < 0 || newValueBasisPoints > 100000) {
      throw new Error('Formula value must be between 0 and 1000%');
    }

    // 3. Сохраняем старое значение для аудита
    const oldValue = formula.value;

    // 4. Обновление значения (business rule)
    const oldVersion = formula.version;
    formula.updateValue(newValueBasisPoints, dto.changeReason ?? undefined);

    // 5. Сохранение
    const updatedFormula = await this.formulaConfigRepository.update(formula);

    // 6. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'FORMULA_UPDATED',
      entityType: 'FormulaConfiguration',
      entityId: updatedFormula.id,
      details: {
        name: formula.name,
        formulaType: formula.formulaType,
        oldValue: oldValue,
        newValue: newValueBasisPoints,
        oldVersion,
        newVersion: formula.version,
        changeReason: dto.changeReason,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 7. Формирование ответа
    return {
      id: updatedFormula.id,
      name: updatedFormula.name,
      formulaType: updatedFormula.formulaType,
      value: updatedFormula.valuePercent,
      isActive: updatedFormula.isActive,
      version: updatedFormula.version,
      description: updatedFormula.description,
      createdAt: updatedFormula.createdAt.toISOString(),
      updatedAt: updatedFormula.updatedAt.toISOString(),
    };
  }
}
