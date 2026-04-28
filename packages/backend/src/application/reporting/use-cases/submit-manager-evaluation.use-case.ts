/**
 * SubmitManagerEvaluationUseCase
 *
 * Создание или обновление оценки руководителя для задачи сотрудника.
 * После сохранения оценки пересчитывает личный отчёт сотрудника.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { ManagerEvaluationRepository } from '../../../domain/repositories/manager-evaluation.repository';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { PlannerTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { BusinessEvaluationRepository } from '../../../domain/repositories/business-evaluation.repository';
import {
  AccessControlService,
  AccessContext,
} from '../../../domain/services/access-control.service';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { ManagerEvaluation } from '../../../domain/entities/manager-evaluation.entity';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import {
  NotFoundError,
  DomainStateError,
  UnauthorizedError,
} from '../../../domain/errors/domain.error';
import { EvaluationResponseDto } from '../dto/evaluation.dto';

export interface SubmitManagerEvaluationParams {
  periodId: string;
  youtrackIssueId: string;
  userId: string;
  evaluationType: string;
  percent?: number | null;
  comment?: string | null;
  evaluatedById: string;
  evaluatorRoles: string[];
  isManagerOf?: (employeeId: string) => boolean | Promise<boolean>;
}

export class SubmitManagerEvaluationUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly managerEvaluationRepository: ManagerEvaluationRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly plannedTaskRepository: PlannerTaskRepository,
    private readonly businessEvaluationRepository: BusinessEvaluationRepository,
    private readonly accessControlService: AccessControlService,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: SubmitManagerEvaluationParams): Promise<EvaluationResponseDto> {
    const {
      periodId,
      youtrackIssueId,
      userId,
      evaluationType,
      percent,
      comment,
      evaluatedById,
      evaluatorRoles,
      isManagerOf,
    } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период не закрыт
    if (period.isClosed()) {
      throw new DomainStateError(
        `Cannot submit evaluation for closed period ${periodId}. Period is in PERIOD_CLOSED state.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем, что период в допустимом состоянии для оценок
    if (
      period.state.value !== 'FACT_LOADED' &&
      period.state.value !== 'EVALUATIONS_DONE' &&
      period.state.value !== 'PLAN_FIXED' &&
      period.state.value !== 'PERIOD_REOPENED'
    ) {
      throw new DomainStateError(
        `Cannot submit evaluation in period state "${period.state.value}". Period must be in FACT_LOADED, EVALUATIONS_DONE, PLAN_FIXED, or PERIOD_REOPENED.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем ABAC права
    const context: AccessContext = {
      userId: evaluatedById,
      userRoles: evaluatorRoles,
      isManagerOf,
    };

    const canEdit = this.accessControlService.canEditManagerEvaluation(
      evaluatedById,
      userId,
      context,
    );

    if (!canEdit) {
      throw new UnauthorizedError(
        'You do not have permission to edit manager evaluation for this user',
      );
    }

    // 4. Ищем существующую оценку
    const existingEvaluation = await this.managerEvaluationRepository.findByPeriodAndIssueAndUser(
      periodId,
      youtrackIssueId,
      userId,
    );

    let savedEvaluation: ManagerEvaluation;

    if (existingEvaluation) {
      // 5a. Обновляем существующую
      existingEvaluation.update({
        evaluationType,
        percent: percent !== null && percent !== undefined ? Percentage.fromPercent(percent) : null,
        comment: comment ?? null,
        evaluatedById,
      });
      savedEvaluation = await this.managerEvaluationRepository.update(existingEvaluation);
    } else {
      // 5b. Создаём новую
      const newEvaluation = ManagerEvaluation.create({
        periodId,
        youtrackIssueId,
        userId,
        evaluatedById,
        evaluationType,
        percent: percent !== null && percent !== undefined ? Percentage.fromPercent(percent) : null,
        comment: comment ?? null,
      });
      savedEvaluation = await this.managerEvaluationRepository.save(newEvaluation);
    }

    // 6. Пересчитываем личный отчёт сотрудника
    await this.recalculatePersonalReport(periodId, userId);

    // 7. Возвращаем DTO
    return EvaluationResponseDto.fromManagerEvaluation({
      id: savedEvaluation.id,
      periodId: savedEvaluation.periodId,
      youtrackIssueId: savedEvaluation.youtrackIssueId,
      userId: savedEvaluation.userId,
      evaluatedById: savedEvaluation.evaluatedById,
      evaluationType: savedEvaluation.evaluationType,
      percent: savedEvaluation.percent?.basisPoints ?? null,
      comment: savedEvaluation.comment,
      createdAt: savedEvaluation.createdAt,
      updatedAt: savedEvaluation.updatedAt,
    });
  }

  /**
   * Пересчёт личного отчёта для одного сотрудника.
   */
  private async recalculatePersonalReport(periodId: string, userId: string): Promise<void> {
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) return;

    const userTasks = await this.plannedTaskRepository.findAssignedToUser(userId, periodId);
    if (userTasks.length === 0) return;

    const formulas = await this.formulaConfigRepository.findActiveAll();
    const managerEvaluations = await this.managerEvaluationRepository.findByUserAndPeriod(
      userId,
      periodId,
    );
    const businessEvaluations = await this.businessEvaluationRepository.findByPeriod(periodId);
    const employeeRate = await this.employeeRateRepository.findEffectiveByUserId(
      userId,
      new Date(),
    );

    // Удаляем старые строки
    const existingReports = await this.personalReportRepository.findByPeriodAndUserId(
      periodId,
      userId,
    );
    for (const report of existingReports) {
      await this.personalReportRepository.delete(report.id);
    }

    // Генерируем новые
    const personalLines = this.reportCalculator.generatePersonalLines({
      userId,
      period,
      plannedTasks: userTasks,
      workItems: [],
      employeeRate,
      managerEvaluation: managerEvaluations.length > 0 ? managerEvaluations[0] : null,
      businessEvaluation: businessEvaluations.length > 0 ? businessEvaluations[0] : null,
      formulas,
    });

    if (personalLines.length > 0) {
      await this.personalReportRepository.saveMany(personalLines);
    }
  }
}
