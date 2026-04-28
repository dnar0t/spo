/**
 * GetEvaluationScalesUseCase
 *
 * Use case для получения справочника шкал оценок.
 */
import { EvaluationScaleRepository } from '../../../domain/repositories/evaluation-scale.repository';

export interface EvaluationScaleResponse {
  id: string;
  scaleType: string;
  name: string;
  percent: number;   // в процентах (0-100)
  isDefault: boolean;
  sortOrder: number;
}

export class GetEvaluationScalesUseCase {
  constructor(
    private readonly evaluationScaleRepository: EvaluationScaleRepository,
  ) {}

  async execute(): Promise<EvaluationScaleResponse[]> {
    const scales = await this.evaluationScaleRepository.findAll();

    // Сортировка: сначала MANAGER, потом BUSINESS, внутри по sortOrder
    scales.sort((a, b) => {
      if (a.scaleType !== b.scaleType) {
        return a.scaleType.localeCompare(b.scaleType);
      }
      return a.sortOrder - b.sortOrder;
    });

    return scales.map(scale => ({
      id: scale.id,
      scaleType: scale.scaleType,
      name: scale.name,
      percent: scale.percentValue,
      isDefault: scale.isDefault,
      sortOrder: scale.sortOrder,
    }));
  }
}
