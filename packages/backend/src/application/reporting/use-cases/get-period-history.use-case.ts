/**
 * GetPeriodHistoryUseCase
 *
 * Получение истории переходов отчётного периода.
 */
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface GetPeriodHistoryParams {
  periodId: string;
}

export interface PeriodHistoryItem {
  id: string;
  fromState: string;
  toState: string;
  userId: string;
  reason: string | null;
  transitionedAt: string;
}

export class GetPeriodHistoryUseCase {
  constructor(
    private readonly periodTransitionRepository: PeriodTransitionRepository,
  ) {}

  async execute(params: GetPeriodHistoryParams): Promise<PeriodHistoryItem[]> {
    const { periodId } = params;

    // Получаем все переходы периода
    const transitions = await this.periodTransitionRepository.findByPeriodId(periodId);

    // Преобразуем в DTO
    return transitions.map(t => ({
      id: t.id,
      fromState: t.fromState.value,
      toState: t.toState.value,
      userId: t.transitionedByUserId,
      reason: t.reason,
      transitionedAt: t.transitionedAt.toISOString(),
    }));
  }
}
