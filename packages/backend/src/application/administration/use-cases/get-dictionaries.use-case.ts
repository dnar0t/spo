/**
 * GetDictionariesUseCase
 *
 * Use case для получения всех справочников (workRoles, evaluationScales).
 */
import { WorkRoleRepository } from '../../../domain/repositories/work-role.repository';
import { EvaluationScaleRepository } from '../../../domain/repositories/evaluation-scale.repository';

export interface DictionariesResponse {
  workRoles: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  evaluationScales: Array<{
    id: string;
    scaleType: string;
    name: string;
    percent: number;   // в процентах (0-100)
    isDefault: boolean;
    sortOrder: number;
  }>;
}

export class GetDictionariesUseCase {
  constructor(
    private readonly workRoleRepository: WorkRoleRepository,
    private readonly evaluationScaleRepository: EvaluationScaleRepository,
  ) {}

  async execute(): Promise<DictionariesResponse> {
    const [workRoles, evaluationScales] = await Promise.all([
      this.workRoleRepository.findAll(),
      this.evaluationScaleRepository.findAll(),
    ]);

    // Сортировка ролей по названию
    workRoles.sort((a, b) => a.name.localeCompare(b.name));

    // Сортировка шкал: сначала MANAGER, потом BUSINESS, внутри по sortOrder
    evaluationScales.sort((a, b) => {
      if (a.scaleType !== b.scaleType) {
        return a.scaleType.localeCompare(b.scaleType);
      }
      return a.sortOrder - b.sortOrder;
    });

    return {
      workRoles: workRoles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
      evaluationScales: evaluationScales.map(scale => ({
        id: scale.id,
        scaleType: scale.scaleType,
        name: scale.name,
        percent: scale.percentValue,
        isDefault: scale.isDefault,
        sortOrder: scale.sortOrder,
      })),
    };
  }
}
