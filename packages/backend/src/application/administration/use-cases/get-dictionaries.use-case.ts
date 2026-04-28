/**
 * GetDictionariesUseCase
 *
 * Use case для получения всех справочников:
 * - workRoles (роли)
 * - evaluationScales (шкалы оценок)
 * - projects (проекты из YouTrackIssue)
 * - systems (системы из YouTrackIssue)
 * - workTypes (типы работ из WorkItem)
 */
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
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
    percent: number;
    isDefault: boolean;
    sortOrder: number;
  }>;
  projects: string[];
  systems: string[];
  workTypes: string[];
}

export class GetDictionariesUseCase {
  constructor(
    private readonly workRoleRepository: WorkRoleRepository,
    private readonly evaluationScaleRepository: EvaluationScaleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(): Promise<DictionariesResponse> {
    const [workRoles, evaluationScales, projectsResult, systemsResult, workTypesResult] =
      await Promise.all([
        this.workRoleRepository.findAll(),
        this.evaluationScaleRepository.findAll(),
        this.prisma.youtrackIssue.findMany({
          where: { project_name: { not: null } },
          distinct: ['project_name'],
          select: { project_name: true },
          orderBy: { project_name: 'asc' },
        }),
        this.prisma.youtrackIssue.findMany({
          where: { system_name: { not: null } },
          distinct: ['system_name'],
          select: { system_name: true },
          orderBy: { system_name: 'asc' },
        }),
        this.prisma.workItem.findMany({
          where: { work_type_name: { not: null } },
          distinct: ['work_type_name'],
          select: { work_type_name: true },
          orderBy: { work_type_name: 'asc' },
        }),
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
      workRoles: workRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
      evaluationScales: evaluationScales.map((scale) => ({
        id: scale.id,
        scaleType: scale.scaleType,
        name: scale.name,
        percent: scale.percentValue,
        isDefault: scale.isDefault,
        sortOrder: scale.sortOrder,
      })),
      projects: projectsResult
        .map((r) => r.project_name)
        .filter((name): name is string => name !== null),
      systems: systemsResult
        .map((r) => r.system_name)
        .filter((name): name is string => name !== null),
      workTypes: workTypesResult
        .map((r) => r.work_type_name)
        .filter((name): name is string => name !== null),
    };
  }
}
