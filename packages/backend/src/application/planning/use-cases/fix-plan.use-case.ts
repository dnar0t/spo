/**
 * FixPlanUseCase
 *
 * Фиксирует план спринта для указанного отчётного периода.
 * - Проверяет, что период существует и находится в состоянии PLANNING
 * - Создаёт новую версию SprintPlan (или обновляет существующую)
 * - Фиксирует план (isFixed = true)
 * - Сохраняет SprintPlan и обновляет ReportingPeriod в одной Prisma-транзакции
 * - Внутри транзакции также записывает OutboxMessage
 * - Публикует событие PlanFixedEvent через in-process EventBus ТОЛЬКО
 *   после успешного коммита транзакции (для внутреннего оповещения)
 * - Критичные интеграции должны читать из outbox через OutboxProcessor
 */
import { Injectable } from '@nestjs/common';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { SprintPlanRepository } from '../../../domain/repositories/sprint-plan.repository';
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { SprintPlan } from '../../../domain/entities/sprint-plan.entity';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { PeriodState } from '../../../domain/value-objects/period-state.vo';
import { Minutes } from '../../../domain/value-objects/minutes.vo';
import { PlanFixedEvent } from '../../../domain/events/plan-fixed.event';
import { FixPlanDto } from '../dto/fix-plan.dto';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { OutboxService } from '../../../infrastructure/outbox.service';
import { EventBusService } from '../../../infrastructure/event-bus.service';

export interface FixPlanResult {
  /** ID плана спринта */
  sprintPlanId: string;
  /** Номер версии после фиксации */
  versionNumber: number;
  /** Общее запланированное время в часах */
  totalPlannedHours: number;
  /** Количество задач в плане */
  taskCount: number;
  /** Дата фиксации */
  fixedAt: string;
  /** ID пользователя, зафиксировавшего план */
  fixedByUserId: string;
}

@Injectable()
export class FixPlanUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly sprintPlanRepository: SprintPlanRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly periodTransitionRepository: PeriodTransitionRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  async execute(periodId: string, userId: string, dto?: FixPlanDto): Promise<FixPlanResult> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не закрыт
    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot fix plan for closed period ${periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем, что период в состоянии PLANNING
    if (!period.isPlanning()) {
      throw new DomainStateError(
        `Cannot fix plan for period ${periodId}: current state is "${period.state.value}". ` +
          'Period must be in PLANNING state.',
      );
    }

    // 4. Проверяем, что userId валиден
    if (!userId || userId.trim().length === 0) {
      throw new NotFoundError('User', '(empty)');
    }

    // 5. Загружаем задачи периода для расчёта метрик
    const plannedTasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    const totalPlannedMinutes = plannedTasks.reduce(
      (sum, task) => sum.add(task.totalPlannedMinutes),
      Minutes.zero(),
    );
    const taskCount = plannedTasks.length;

    // 6. Получаем или создаём SprintPlan
    let sprintPlan = await this.sprintPlanRepository.findByPeriodId(periodId);

    if (!sprintPlan) {
      // Создаём новый план (версия 1)
      sprintPlan = SprintPlan.create({
        periodId,
        versionNumber: 1,
        isFixed: false,
        totalPlannedMinutes,
        taskCount,
      });
    } else {
      // Обновляем существующий план
      sprintPlan.updateTotalPlanned(totalPlannedMinutes);
      sprintPlan.updateTaskCount(taskCount);
    }

    // 7. Фиксируем план (инкрементирует версию внутри)
    sprintPlan.fix(userId);

    const previousState = period.state;
    period.transitionTo(PeriodState.planFixed());

    // 8. Создаём аудитный переход
    const transition = PeriodTransition.create({
      periodId,
      fromState: previousState,
      toState: period.state,
      transitionedByUserId: userId,
      reason: dto?.comment ?? null,
    });

    // 9. Выполняем всё в одной Prisma-транзакции: сохраняем данные + outbox
    const savedPlan = await this.prisma.$transaction(async (tx) => {
      // Сохраняем SprintPlan
      const plan = await this.sprintPlanRepository.save(sprintPlan);

      // Записываем событие в outbox (внутри той же транзакции)
      await this.outboxService.write(
        {
          aggregateType: 'ReportingPeriod',
          aggregateId: periodId,
          eventName: PlanFixedEvent.name,
          payload: {
            periodId,
            versionNumber: plan.versionNumber,
            fixedByUserId: userId,
            totalPlannedMinutes: totalPlannedMinutes.minutes,
            taskCount,
          },
        },
        tx,
      );

      // Сохраняем переход состояния
      await this.periodTransitionRepository.save(transition);

      // Обновляем период
      await this.reportingPeriodRepository.update(period);

      return plan;
    });

    // 10. Публикуем событие через in-process EventBus ТОЛЬКО после успешного коммита.
    //     Это допустимо для оповещения других частей приложения in-process,
    //     НО критичные интеграции должны читать из outbox через OutboxProcessor.
    const event = new PlanFixedEvent({
      periodId,
      versionNumber: savedPlan.versionNumber,
      fixedByUserId: userId,
      totalPlannedMinutes: totalPlannedMinutes.minutes,
      taskCount,
    });

    // Fire-and-forget — не блокируем ответ клиента
    this.eventBus.publish(event).catch((err) => {
      console.error(`[FixPlanUseCase] Failed to publish event in-process: ${err.message}`);
    });

    // 11. Возвращаем результат
    return {
      sprintPlanId: savedPlan.id,
      versionNumber: savedPlan.versionNumber,
      totalPlannedHours: savedPlan.totalPlannedMinutes.hours,
      taskCount: savedPlan.taskCount,
      fixedAt: savedPlan.fixedAt!.toISOString(),
      fixedByUserId: savedPlan.fixedByUserId!,
    };
  }
}
