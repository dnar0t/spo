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
 * - Work Items и Issues (заглушки — будут добавлены при интеграции с YouTrack)
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

export interface CreateSnapshotParams {
  periodId: string;
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

    // 3. Создаём сущность снэпшота
    const snapshot = PeriodSnapshot.create({
      periodId,
      employeeRates: { items: employeeRates },
      formulas: { items: formulas },
      evaluationScales: { items: evaluationScales },
      workItems: { items: [] }, // TODO: добавить при интеграции с YouTrack
      issues: { items: [] },    // TODO: добавить при интеграции с YouTrack
      issueHierarchy: { items: [] }, // TODO: добавить при интеграции с YouTrack
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
