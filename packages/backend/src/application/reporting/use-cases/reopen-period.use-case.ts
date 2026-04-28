/**
 * ReopenPeriodUseCase
 *
 * Переоткрытие закрытого периода (только ADMIN / DIRECTOR).
 * При переоткрытии удаляет снэпшот данных периода.
 * Создаёт аудит-запись перехода и сохраняет причину переоткрытия.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { PeriodSnapshotRepository } from '../../../domain/repositories/period-snapshot.repository';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { PeriodState } from '../../../domain/value-objects/period-state.vo';
import {
  AccessControlService,
  AccessContext,
} from '../../../domain/services/access-control.service';
import {
  NotFoundError,
  DomainStateError,
  UnauthorizedError,
} from '../../../domain/errors/domain.error';

export interface ReopenPeriodParams {
  periodId: string;
  userId: string;
  userRoles: string[];
  reason: string;
}

export interface ReopenPeriodResult {
  periodId: string;
  previousState: string;
  currentState: string;
  reopenedAt: string;
  reopenReason: string;
}

export class ReopenPeriodUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly periodTransitionRepository: PeriodTransitionRepository,
    private readonly periodSnapshotRepository: PeriodSnapshotRepository,
    private readonly accessControlService: AccessControlService,
  ) {}

  async execute(params: ReopenPeriodParams): Promise<ReopenPeriodResult> {
    const { periodId, userId, userRoles, reason } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем ABAC права (только ADMIN / DIRECTOR)
    const context: AccessContext = {
      userId,
      userRoles,
    };

    if (!this.accessControlService.canReopenPeriod(context)) {
      throw new UnauthorizedError('Only ADMIN or DIRECTOR can reopen a period');
    }

    // 3. Проверяем, что период закрыт или может быть переоткрыт
    const targetState = PeriodState.periodReopened();
    if (!period.state.canTransitionTo(targetState)) {
      throw new DomainStateError(
        `Cannot reopen period ${periodId} from state "${period.state.value}". ` +
          `Only periods in CLOSED state can be reopened.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 4. Фиксируем предыдущее состояние
    const previousState = period.state;

    // 5. Выполняем переоткрытие через бизнес-метод доменной сущности
    //    (внутри устанавливает reopenedAt, reopenReason)
    period.transitionTo(targetState, userId, reason);

    // 6. Создаём запись аудита перехода
    const transition = PeriodTransition.create({
      periodId,
      fromState: previousState,
      toState: targetState,
      transitionedByUserId: userId,
      reason: `Period reopened: ${reason}`,
    });

    // 7. Сохраняем переход и обновлённый период
    await this.periodTransitionRepository.save(transition);
    const savedPeriod = await this.reportingPeriodRepository.update(period);

    // 8. Удаляем снэпшот периода (данные больше не заморожены)
    const existingSnapshot = await this.periodSnapshotRepository.findByPeriodId(periodId);
    if (existingSnapshot) {
      await this.periodSnapshotRepository.delete(existingSnapshot.id);
    }

    // 9. Возвращаем результат
    return {
      periodId: savedPeriod.id,
      previousState: previousState.value,
      currentState: savedPeriod.state.value,
      reopenedAt: savedPeriod.reopenedAt?.toISOString() ?? new Date().toISOString(),
      reopenReason: reason,
    };
  }
}
