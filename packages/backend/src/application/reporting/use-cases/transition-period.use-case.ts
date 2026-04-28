/**
 * TransitionPeriodUseCase (Workflow)
 *
 * Расширенный use case для выполнения переходов отчётного периода
 * в соответствии со стейт-машиной (PeriodState).
 * Поддерживает все разрешённые переходы.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { PeriodState } from '../../../domain/value-objects/period-state.vo';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface TransitionPeriodParams {
  periodId: string;
  targetState: string;
  userId: string;
  reason?: string | null;
}

export interface TransitionPeriodResult {
  periodId: string;
  previousState: string;
  currentState: string;
  transitionedAt: string;
}

export class TransitionPeriodUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly periodTransitionRepository: PeriodTransitionRepository,
  ) {}

  async execute(params: TransitionPeriodParams): Promise<TransitionPeriodResult> {
    const { periodId, targetState, userId, reason } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Создаём целевое состояние из строки
    const newState = PeriodState.fromString(targetState);

    // 3. Проверяем, что текущее состояние может перейти в целевое
    if (!period.state.canTransitionTo(newState)) {
      throw new DomainStateError(
        `Cannot transition period ${periodId} from "${period.state.value}" to "${targetState}". ` +
        `Allowed transitions from "${period.state.value}": ` +
        PeriodState.VALUES.filter((s) => period.state.canTransitionTo(PeriodState.fromString(s)))
          .join(', '),
        {
          periodId,
          fromState: period.state.value,
          toState: targetState,
          userId,
        },
      );
    }

    // 4. Фиксируем предыдущее состояние до перехода
    const previousState = period.state;

    // 5. Выполняем переход через бизнес-метод доменной сущности
    period.transitionTo(newState, userId, reason ?? undefined);

    // 6. Создаём запись аудита перехода
    const transition = PeriodTransition.create({
      periodId,
      fromState: previousState,
      toState: newState,
      transitionedByUserId: userId,
      reason: reason ?? null,
    });

    // 7. Сохраняем переход и обновлённый период
    await this.periodTransitionRepository.save(transition);
    const savedPeriod = await this.reportingPeriodRepository.update(period);

    // 8. Возвращаем результат
    return {
      periodId: savedPeriod.id,
      previousState: previousState.value,
      currentState: savedPeriod.state.value,
      transitionedAt: transition.transitionedAt.toISOString(),
    };
  }
}
