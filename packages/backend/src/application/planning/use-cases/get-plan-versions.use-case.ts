/**
 * GetPlanVersionsUseCase
 *
 * Возвращает список версий плана спринта для указанного отчётного периода.
 * - Проверяет, что период существует
 * - Получает SprintPlan для периода
 * - Получает SprintPlanVersion для каждого плана
 * - Возвращает список версий
 */
import { SprintPlanRepository } from '../../../domain/repositories/sprint-plan.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface PlanVersionDto {
  /** ID версии плана */
  id: string;
  /** Номер версии */
  versionNumber: number;
  /** Зафиксирован ли план */
  isFixed: boolean;
  /** Дата фиксации */
  fixedAt: string | null;
  /** ID пользователя, зафиксировавшего план */
  fixedByUserId: string | null;
  /** Общее запланированное время в часах */
  totalPlannedHours: number;
  /** Количество задач */
  taskCount: number;
  /** Дата создания версии */
  createdAt: string;
  /** Дата обновления */
  updatedAt: string;
}

export class GetPlanVersionsUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly sprintPlanRepository: SprintPlanRepository,
  ) {}

  /**
   * Получить список версий плана для периода.
   * @param periodId - ID отчётного периода
   * @returns Массив DTO версий плана, отсортированный по убыванию номера версии
   */
  async execute(periodId: string): Promise<PlanVersionDto[]> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все версии планов для периода
    const plans = await this.sprintPlanRepository.findVersionsByPeriodId(periodId);

    // 3. Если планов нет, возвращаем пустой массив
    if (plans.length === 0) {
      return [];
    }

    // 4. Преобразуем в DTO
    return plans.map((plan) => ({
      id: plan.id,
      versionNumber: plan.versionNumber,
      isFixed: plan.isFixed,
      fixedAt: plan.fixedAt?.toISOString() ?? null,
      fixedByUserId: plan.fixedByUserId,
      totalPlannedHours: plan.totalPlannedMinutes.hours,
      taskCount: plan.taskCount,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }));
  }
}
