/**
 * CreateSnapshotUseCase
 *
 * Создаёт снэпшот всех данных отчётного периода для обеспечения
 * неизменности (immutability) закрытого периода.
 *
 * Собирает и сериализует:
 * - Ставки сотрудников (EmployeeRate)
 * - Формулы (FormulaConfig)
 * - Шкалы оценок (EvaluationScale)
 * - Личные отчёты (PersonalReport)
 * - Итоговый отчёт (SummaryReport)
 * - Work Items и Issues (фактические данные из БД)
 *
 * После создания снэпшота данные периода считаются "замороженными"
 * и не подлежат изменению (до момента переоткрытия).
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { FormulaConfigRepository } from '../../../domain/repositories/formula-config.repository';
import { EvaluationScaleRepository } from '../../../domain/repositories/evaluation-scale.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { PeriodSnapshotRepository } from '../../../domain/repositories/period-snapshot.repository';
import { PeriodSnapshot } from '../../../domain/entities/period-snapshot.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface CreateSnapshotParams {
  periodId: string;
}

/** Интерфейс work item для снэпшота */
interface SnapshotWorkItem {
  id: string;
  issueId: string;
  userId: string | null;
  date: string | null;
  minutes: number;
  description: string | null;
}

/** Интерфейс issue для снэпшота */
interface SnapshotIssue {
  id: string;
  issueId: string;
  summary: string;
  project: string | null;
  systemName: string | null;
  type: string | null;
  priority: string | null;
  state: string | null;
  assigneeId: string | null;
  estimation: number | null;
  spentTime: number;
}

/** Пара parent-child для иерархии */
interface SnapshotHierarchyEdge {
  parentId: string;
  childId: string;
}

export class CreateSnapshotUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly formulaConfigRepository: FormulaConfigRepository,
    private readonly evaluationScaleRepository: EvaluationScaleRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly summaryReportRepository: SummaryReportRepository,
    private readonly periodSnapshotRepository: PeriodSnapshotRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(params: CreateSnapshotParams): Promise<PeriodSnapshot> {
    const { periodId } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Собираем все данные периода
    const employeeRates = await this.collectEmployeeRates();
    const formulas = await this.collectFormulas();
    const evaluationScales = await this.collectEvaluationScales();
    const personalReports = await this.collectPersonalReports(periodId);
    const summaryReports = await this.collectSummaryReports(periodId);
    const workItems = await this.collectWorkItems(periodId);
    const issues = await this.collectIssues(periodId);
    const issueHierarchy = await this.collectIssueHierarchy(periodId);

    // 3. Создаём сущность снэпшота
    const snapshot = PeriodSnapshot.create({
      periodId,
      employeeRates: { items: employeeRates },
      formulas: { items: formulas },
      evaluationScales: { items: evaluationScales },
      workItems: { items: workItems },
      issues: { items: issues },
      issueHierarchy: { items: issueHierarchy },
      reportLines: { personalReports, summaryReports },
      aggregates: this.calculateAggregates(personalReports, summaryReports),
    });

    // 4. Сохраняем
    const saved = await this.periodSnapshotRepository.save(snapshot);

    return saved;
  }

  /**
   * Собрать все ставки сотрудников.
   */
  private async collectEmployeeRates(): Promise<unknown[]> {
    const rates = await this.employeeRateRepository.findAll();
    return rates.map((r) => r.toPersistence());
  }

  /**
   * Собрать все формулы.
   */
  private async collectFormulas(): Promise<unknown[]> {
    const formulas = await this.formulaConfigRepository.findAll();
    return formulas.map((f) => f.toPersistence());
  }

  /**
   * Собрать все шкалы оценок.
   */
  private async collectEvaluationScales(): Promise<unknown[]> {
    const scales = await this.evaluationScaleRepository.findAll();
    return scales.map((s) => s.toPersistence());
  }

  /**
   * Собрать все строки личных отчётов периода.
   */
  private async collectPersonalReports(periodId: string): Promise<unknown[]> {
    const reports = await this.personalReportRepository.findByPeriodId(periodId);
    return reports.map((r) => r.toPersistence());
  }

  /**
   * Собрать данные итогового отчёта периода.
   */
  private async collectSummaryReports(periodId: string): Promise<unknown[]> {
    const summaries = await this.summaryReportRepository.findByPeriodId(periodId);
    return summaries.map((s) => s.toPersistence());
  }

  /**
   * Собрать work items периода.
   *
   * Находит все WorkItem записи, относящиеся к периоду,
   * и возвращает их в виде плоского JSON-массива.
   */
  private async collectWorkItems(periodId: string): Promise<SnapshotWorkItem[]> {
    const records = await this.prisma.workItem.findMany({
      where: { periodId },
      select: {
        id: true,
        issueId: true,
        authorId: true,
        workDate: true,
        durationMinutes: true,
        description: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      issueId: r.issueId,
      userId: r.authorId,
      date: r.workDate ? r.workDate.toISOString() : null,
      minutes: r.durationMinutes,
      description: r.description,
    }));
  }

  /**
   * Собрать issues (задачи) периода.
   *
   * Находит все YouTrackIssue, связанные с задачами спринта (PlannedTask)
   * данного периода, и возвращает их в виде JSON-массива
   * с ключевыми полями: id, issueId, summary, project, systemName,
   * type, priority, state, assigneeId, estimation, spentTime.
   *
   * spentTime вычисляется как сумма durationMinutes всех work items задачи.
   */
  private async collectIssues(periodId: string): Promise<SnapshotIssue[]> {
    // 1. Находим all issueId из PlannedTask для данного периода
    const plannedTasks = await this.prisma.plannedTask.findMany({
      where: {
        sprintPlan: { periodId },
      },
      select: {
        youtrackIssueId: true,
      },
    });

    const issueIds = [...new Set(plannedTasks.map((t) => t.youtrackIssueId))];
    if (issueIds.length === 0) {
      return [];
    }

    // 2. Загружаем сами YouTrackIssue по найденным ID
    const issues = await this.prisma.youTrackIssue.findMany({
      where: { id: { in: issueIds } },
      select: {
        id: true,
        youtrackId: true,
        summary: true,
        projectName: true,
        systemName: true,
        typeName: true,
        priorityName: true,
        stateName: true,
        assigneeId: true,
        estimationMinutes: true,
      },
    });

    // 3. Собираем spentTime — сумму durationMinutes всех work items по каждой задаче
    const workItemAggregations = await this.prisma.workItem.groupBy({
      by: ['issueId'],
      where: {
        issueId: { in: issueIds },
        periodId,
      },
      _sum: { durationMinutes: true },
    });

    const spentTimeMap = new Map<string, number>();
    for (const agg of workItemAggregations) {
      spentTimeMap.set(agg.issueId, agg._sum.durationMinutes ?? 0);
    }

    // 4. Формируем результат
    return issues.map((issue) => ({
      id: issue.id,
      issueId: issue.youtrackId,
      summary: issue.summary,
      project: issue.projectName,
      systemName: issue.systemName,
      type: issue.typeName,
      priority: issue.priorityName,
      state: issue.stateName,
      assigneeId: issue.assigneeId,
      estimation: issue.estimationMinutes,
      spentTime: spentTimeMap.get(issue.id) ?? 0,
    }));
  }

  /**
   * Собрать иерархию задач периода.
   *
   * Строит parent/subtask иерархию на основе parentIssueId
   * в YouTrackIssue, отфильтрованных по задачам спринта периода.
   * Возвращает JSON-массив пар { parentId, childId }.
   */
  private async collectIssueHierarchy(periodId: string): Promise<SnapshotHierarchyEdge[]> {
    // 1. Получаем все issueId, связанные с периодом через PlannedTask
    const plannedTasks = await this.prisma.plannedTask.findMany({
      where: {
        sprintPlan: { periodId },
      },
      select: {
        youtrackIssueId: true,
      },
    });

    const issueIds = [...new Set(plannedTasks.map((t) => t.youtrackIssueId))];
    if (issueIds.length === 0) {
      return [];
    }

    // 2. Загружаем все YouTrackIssue, у которых есть parentIssueId
    //    среди задач периода (или которые сами являются родителями)
    const issues = await this.prisma.youTrackIssue.findMany({
      where: {
        id: { in: issueIds },
        parentIssueId: { not: null },
      },
      select: {
        id: true,
        parentIssueId: true,
      },
    });

    // 3. Формируем массив связей parent-child
    const hierarchy: SnapshotHierarchyEdge[] = [];
    for (const issue of issues) {
      if (issue.parentIssueId) {
        hierarchy.push({
          parentId: issue.parentIssueId,
          childId: issue.id,
        });
      }
    }

    return hierarchy;
  }

  /**
   * Рассчитать агрегированные показатели периода.
   */
  private calculateAggregates(
    personalReports: unknown[],
    _summaryReports: unknown[],
  ): Record<string, unknown> {
    const personalArray = personalReports as Array<Record<string, unknown>>;

    const totalBaseAmount = personalArray.reduce(
      (sum, r) => sum + ((r.base_amount as number) ?? 0),
      0,
    );
    const totalOnHand = personalArray.reduce(
      (sum, r) => sum + ((r.total_on_hand as number) ?? 0),
      0,
    );
    const totalWithTax = personalArray.reduce(
      (sum, r) => sum + ((r.total_with_tax as number) ?? 0),
      0,
    );
    const totalMinutes = personalArray.reduce(
      (sum, r) => sum + ((r.actual_minutes as number) ?? 0),
      0,
    );

    return {
      totalBaseAmount,
      totalOnHand,
      totalWithTax,
      totalMinutes,
      personalReportsCount: personalArray.length,
      capturedAt: new Date().toISOString(),
    };
  }
}
