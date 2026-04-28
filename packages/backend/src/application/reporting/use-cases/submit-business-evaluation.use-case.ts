/**
 * SubmitBusinessEvaluationUseCase
 *
 * Создание или обновление бизнес-оценки для задачи в периоде.
 * После сохранения оценки пересчитывает личные отчёты всех сотрудников,
 * работавших над этой задачей.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { BusinessEvaluationRepository } from '../../../domain/repositories/business-evaluation.repository';
import { ManagerEvaluationRepository } from '../../../domain/repositories/manager-evaluation.repository';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { PlannerTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { AccessControlService, AccessContext } from '../../../domain/services/access-control.service';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { BusinessEvaluation } from '../../../domain/entities/business-evaluation.entity';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { NotFoundError, DomainStateError, UnauthorizedError } from '../../../domain/errors/domain.error';
import { EvaluationResponseDto } from '../dto/evaluation.dto';

export interface SubmitBusinessEvaluationParams {
  periodId: string;
  youtrackIssueId: string;
  evaluationType: string;
  percent?: number | null;
  comment?: string | null;
  evaluatedById: string;
  evaluatorRoles: string[];
  isBusinessEvaluator?: boolean;
}

export class SubmitBusinessEvaluationUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly businessEvaluationRepository: BusinessEvaluationRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly managerEvaluationRepository: ManagerEvaluationRepository,
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly plannedTaskRepository: PlannerTaskRepository,
    private readonly accessControlService: AccessControlService,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: SubmitBusinessEvaluationParams): Promise<EvaluationResponseDto> {
    const { periodId, youtrackIssueId, evaluationType, percent, comment, evaluatedById, evaluatorRoles, isBusinessEvaluator } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период в допустимом состоянии для оценок
    if (period.state.value !== 'FACT_LOADED' && period.state.value !== 'EVALUATIONS_DONE' && period.state.value !== 'PLAN_FIXED' && period.state.value !== 'PERIOD_REOPENED') {
      throw new DomainStateError(
        `Cannot submit business evaluation in period state "${period.state.value}". Period must be in FACT_LOADED, EVALUATIONS_DONE, PLAN_FIXED, or PERIOD_REOPENED.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Проверяем ABAC права
    const context: AccessContext = {
      userId: evaluatedById,
      userRoles: evaluatorRoles,
      isBusinessEvaluator,
    };

    const canEdit = this.accessControlService.canEditBusinessEvaluation(context);

    if (!canEdit) {
      throw new UnauthorizedError(
        'You do not have permission to edit business evaluation',
      );
    }

    // 4. Ищем существующую оценку по evaluationKey (periodId + issueId)
    const evaluationKey = `${periodId}_${youtrackIssueId}`;
    const existingEvaluation = await this.businessEvaluationRepository.findByEvaluationKey(evaluationKey);

    let savedEvaluation: BusinessEvaluation;

    if (existingEvaluation) {
      // 5a. Обновляем существующую
      existingEvaluation.update({
        evaluationType,
        percent: percent !== null && percent !== undefined ? Percentage.fromPercent(percent) : null,
        comment: comment ?? null,
        evaluatedById,
        evaluationKey,
      });
      savedEvaluation = await this.businessEvaluationRepository.update(existingEvaluation);
    } else {
      // 5b. Создаём новую
      const newEvaluation = BusinessEvaluation.create({
        periodId,
        youtrackIssueId,
        evaluatedById,
        evaluationType,
        percent: percent !== null && percent !== undefined ? Percentage.fromPercent(percent) : null,
        comment: comment ?? null,
        evaluationKey,
      });
      savedEvaluation = await this.businessEvaluationRepository.save(newEvaluation);
    }

    // 6. Пересчитываем личные отчёты всех сотрудников, назначенных на эту задачу
    await this.recalculatePersonalReportsForIssue(periodId, youtrackIssueId);

    // 7. Возвращаем DTO
    return EvaluationResponseDto.fromBusinessEvaluation({
      id: savedEvaluation.id,
      periodId: savedEvaluation.periodId,
      youtrackIssueId: savedEvaluation.youtrackIssueId,
      evaluatedById: savedEvaluation.evaluatedById,
      evaluationType: savedEvaluation.evaluationType,
      percent: savedEvaluation.percent?.basisPoints ?? null,
      comment: savedEvaluation.comment,
      createdAt: savedEvaluation.createdAt,
      updatedAt: savedEvaluation.updatedAt,
    });
  }

  /**
   * Пересчёт личных отчётов для всех сотрудников, работавших над задачей.
   */
  private async recalculatePersonalReportsForIssue(periodId: string, youtrackIssueId: string): Promise<void> {
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) return;

    // Находим задачи, связанные с этим issue
    const task = await this.plannedTaskRepository.findByIssueNumber(youtrackIssueId, periodId);
    // Находим все personal report строки для этого issue
    const reportLines = await this.personalReportRepository.findByPeriodAndIssue(periodId, youtrackIssueId);

    // Собираем уникальных userId из reportLines
    const userIds = new Set<string>();
    for (const line of reportLines) {
      userIds.add(line.userId);
    }

    // Если есть назначенный сотрудник, добавляем его
    if (task && task.assigneeId) {
      userIds.add(task.assigneeId);
    }

    const formulas = await this.formulaConfigRepository.findActiveAll();
    const businessEvaluations = await this.businessEvaluationRepository.findByPeriod(periodId);

    // Пересчитываем для каждого сотрудника
    for (const userId of userIds) {
      const userTasks = await this.plannedTaskRepository.findAssignedToUser(userId, periodId);
      if (userTasks.length === 0) continue;

      const managerEvaluations = await this.managerEvaluationRepository.findByUserAndPeriod(userId, periodId);
      const employeeRate = await this.employeeRateRepository.findEffectiveByUserId(userId, new Date());

      // Удаляем старые строки
      const existingReports = await this.personalReportRepository.findByPeriodAndUserId(periodId, userId);
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
}
