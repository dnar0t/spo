/**
 * GeneratePersonalReportsUseCase
 *
 * Генерирует личные отчёты для всех сотрудников периода.
 * Для каждого сотрудника: planned tasks + work items + ставка + оценки + формулы
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { ManagerEvaluationRepository } from '../../../domain/repositories/manager-evaluation.repository';
import { BusinessEvaluationRepository } from '../../../domain/repositories/business-evaluation.repository';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { PlannerTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ReportCalculator } from '../../../domain/services/report-calculator.service';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface GeneratePersonalReportsParams {
  periodId: string;
  userIds?: string[]; // если указан — только для этих пользователей
}

export class GeneratePersonalReportsUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannerTaskRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly managerEvaluationRepository: ManagerEvaluationRepository,
    private readonly businessEvaluationRepository: BusinessEvaluationRepository,
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly userRepository: UserRepository,
    private readonly reportCalculator: ReportCalculator,
  ) {}

  async execute(params: GeneratePersonalReportsParams): Promise<{ generatedCount: number; userIds: string[] }> {
    const { periodId, userIds } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем запланированные задачи
    const plannedTasks = await this.plannedTaskRepository.findByPeriodId(periodId);

    // 3. Определяем, для кого генерировать отчёты
    let targetUserIds = userIds;
    if (!targetUserIds) {
      // Собираем всех assignee из задач
      const assigneeSet = new Set<string>();
      for (const task of plannedTasks) {
        if (task.assigneeId) assigneeSet.add(task.assigneeId);
      }
      targetUserIds = Array.from(assigneeSet);
    }

    if (targetUserIds.length === 0) {
      return { generatedCount: 0, userIds: [] };
    }

    // 4. Получаем формулы
    const formulas = await this.formulaConfigRepository.findActiveAll();

    // 5. Удаляем старые личные отчёты для указанных пользователей
    for (const userId of targetUserIds) {
      const existingReports = await this.personalReportRepository.findByPeriodAndUserId(periodId, userId);
      for (const report of existingReports) {
        await this.personalReportRepository.delete(report.id);
      }
    }

    // 6. Генерируем новые отчёты
    let totalGenerated = 0;
    const generatedUserIds: string[] = [];

    for (const userId of targetUserIds) {
      const userTasks = plannedTasks.filter(t => t.assigneeId === userId);
      if (userTasks.length === 0) continue;

      // Получаем оценки
      const managerEvaluations = await this.managerEvaluationRepository.findByUserAndPeriod(userId, periodId);
      const businessEvaluations = await this.businessEvaluationRepository.findByPeriod(periodId);

      // Получаем ставку сотрудника
      const employeeRate = await this.employeeRateRepository.findEffectiveByUserId(userId, new Date());

      // Получаем информацию о пользователе
      const user = await this.userRepository.findById(userId);

      // Генерируем строки личного отчёта
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
        totalGenerated += personalLines.length;
        generatedUserIds.push(userId);
      }
    }

    return {
      generatedCount: totalGenerated,
      userIds: generatedUserIds,
    };
  }
}
