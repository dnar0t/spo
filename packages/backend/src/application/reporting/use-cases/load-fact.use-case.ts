/**
 * LoadFactUseCase
 *
 * Загружает фактические трудозатраты (work items) из YouTrack для периода.
 * 1. Вызывает SyncEngine.syncWorkItemsByPeriod(periodId)
 * 2. Обновляет ReportingPeriod state → FACT_LOADED
 * 3. Выпускает FactLoadedEvent
 * 4. Запускает пересчёт отчётов (generate personal + summary)
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PeriodTransitionRepository } from '../../../domain/repositories/period-transition.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { ManagerEvaluationRepository } from '../../../domain/repositories/manager-evaluation.repository';
import { BusinessEvaluationRepository } from '../../../domain/repositories/business-evaluation.repository';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { PeriodTransition } from '../../../domain/entities/period-transition.entity';
import { PeriodState } from '../../../domain/value-objects/period-state.vo';
import { FactLoadedEvent } from '../../../domain/events/fact-loaded.event';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';
import { SyncEngine } from '../../../infrastructure/youtrack/sync-engine';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import type { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';

export interface LoadFactParams {
  periodId: string;
  userId: string;
  source?: 'MANUAL' | 'SCHEDULED';
}

export class LoadFactUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly periodTransitionRepository: PeriodTransitionRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly managerEvaluationRepository: ManagerEvaluationRepository,
    private readonly businessEvaluationRepository: BusinessEvaluationRepository,
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly userRepository: UserRepository,
    private readonly syncEngine: SyncEngine,
    private readonly reportCalculator: ReportCalculator,
    private readonly eventBus?: { publish: (event: FactLoadedEvent) => Promise<void> },
  ) {}

  async execute(
    params: LoadFactParams,
  ): Promise<{ personalReportsCount: number; summaryReportsCount: number; workItemCount: number }> {
    const { periodId, userId, source = 'MANUAL' } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не закрыт
    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot load fact for closed period ${periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем, что можно загрузить факт (период должен быть в PLAN_FIXED или PERIOD_REOPENED)
    if (!period.state.canTransitionTo(PeriodState.factLoaded())) {
      throw new DomainStateError(
        `Cannot load fact for period ${periodId} in state "${period.state.value}". ` +
          `Current state must allow transition to FACT_LOADED.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Сохраняем предыдущее состояние
    const previousState = period.state;

    // 4. Выполняем синхронизацию work items через SyncEngine
    const syncResult = await this.syncEngine.syncWorkItemsByPeriod(periodId);
    const workItemCount = (syncResult?.created ?? 0) + (syncResult?.updated ?? 0);

    // 5. Переводим период в FACT_LOADED
    period.transitionTo(PeriodState.factLoaded(), userId);
    await this.reportingPeriodRepository.update(period);

    // 6. Создаём запись аудита перехода
    const transition = PeriodTransition.create({
      periodId,
      fromState: previousState,
      toState: PeriodState.factLoaded(),
      transitionedByUserId: userId,
      reason: `Fact loaded via ${source} sync. Work items: ${workItemCount}`,
    });
    await this.periodTransitionRepository.save(transition);

    // 7. Выпускаем событие
    if (this.eventBus) {
      const event = new FactLoadedEvent({
        periodId,
        source,
        workItemCount,
        loadedAt: new Date(),
      });
      await this.eventBus.publish(event);
    }

    // 8. Пересчитываем отчёты
    const reportsCount = await this.recalculateReports(periodId);

    return {
      personalReportsCount: reportsCount.personal,
      summaryReportsCount: reportsCount.summary,
      workItemCount,
    };
  }

  /**
   * Пересчёт отчётов периода: удаляем старые и генерируем новые.
   */
  private async recalculateReports(
    periodId: string,
  ): Promise<{ personal: number; summary: number }> {
    // Получаем период
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod', periodId);

    // Получаем запланированные задачи
    const plannedTasks = await this.plannedTaskRepository.findByPeriodId(periodId);

    // Получаем все work items периода (через issues)
    // Группируем задачи по assignee
    const assigneeIds = new Set<string>();
    for (const task of plannedTasks) {
      if (task.assigneeId) assigneeIds.add(task.assigneeId);
    }

    // Получаем формулы
    const formulas = await this.formulaConfigRepository.findActiveAll();

    // Удаляем старые отчёты
    await this.personalReportRepository.deleteByPeriodId(periodId);
    await this.summaryReportRepository.deleteByPeriodId(periodId);

    let totalPersonalSaved = 0;

    // Генерируем персональные отчёты для каждого сотрудника
    for (const userId of assigneeIds) {
      const userTasks = plannedTasks.filter((t) => t.assigneeId === userId);

      if (userTasks.length === 0) continue;

      // Получаем оценки
      const managerEval = await this.managerEvaluationRepository.findByUserAndPeriod(
        userId,
        periodId,
      );
      const businessEval = await this.businessEvaluationRepository.findByPeriod(periodId);

      // Получаем ставку сотрудника
      const employeeRate = await this.employeeRateRepository.findEffectiveByUserId(
        userId,
        new Date(),
      );

      // Генерируем строки личного отчёта
      const personalLines = this.reportCalculator.generatePersonalLines({
        userId,
        period,
        plannedTasks: userTasks,
        workItems: [], // work items уже загружены и доступны через БД
        employeeRate,
        managerEvaluation: managerEval.length > 0 ? managerEval[0] : null,
        businessEvaluation: businessEval.length > 0 ? businessEval[0] : null,
        formulas,
      });

      if (personalLines.length > 0) {
        await this.personalReportRepository.saveMany(personalLines);
        totalPersonalSaved += personalLines.length;
      }
    }

    // Генерируем итоговый отчёт
    const personalReports = await this.personalReportRepository.findByPeriodId(periodId);
    const groupByLevel = period.businessGroupingLevel ?? 'STORY';
    const summaryLines = this.reportCalculator.generateSummaryLines({
      period,
      personalReports,
      groupByLevel,
    });

    if (summaryLines.length > 0) {
      await this.summaryReportRepository.saveMany(summaryLines);
    }

    return {
      personal: totalPersonalSaved,
      summary: summaryLines.length,
    };
  }
}
