/**
 * GetFormulasUseCase
 *
 * Use case для получения списка формул.
 */
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { FormulaResponseDto } from '../dto/formula-response.dto';

export class GetFormulasUseCase {
  constructor(
    private readonly formulaConfigRepository: FormulaConfigRepository,
  ) {}

  async execute(): Promise<FormulaResponseDto[]> {
    const formulas = await this.formulaConfigRepository.findAll();

    // Сортировка по типу и названию
    formulas.sort((a, b) => {
      const typeCompare = a.formulaType.localeCompare(b.formulaType);
      if (typeCompare !== 0) return typeCompare;
      return a.name.localeCompare(b.name);
    });

    return formulas.map(formula => ({
      id: formula.id,
      name: formula.name,
      formulaType: formula.formulaType,
      value: formula.valuePercent,
      isActive: formula.isActive,
      version: formula.version,
      description: formula.description,
      createdAt: formula.createdAt.toISOString(),
      updatedAt: formula.updatedAt.toISOString(),
    }));
  }
}
