/**
 * FreezeFinancialsUseCase
 *
 * Заморозка финансовых данных для строк личного отчёта в периоде.
 * После заморозки:
 * - Финансовые поля (baseAmount, managerAmount, businessAmount, totalOnHand,
 *   ndfl, insurance, reserveVacation, totalWithTax, effectiveRate)
 *   больше не пересчитываются автоматически.
 * - Требуется явный вызов unfreeze или recalculate для обновления.
 *
 * Используется перед закрытием периода для фиксации финансов.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';
import { FreezeFinancialsResponseDto } from '../dto/freeze-financials.dto';

export interface FreezeFinancialsParams {
  periodId: string;
  frozenById: string;
  userRoles: string[];
}

export class FreezeFinancialsUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(params: FreezeFinancialsParams): Promise<FreezeFinancialsResponseDto> {
    const { periodId, frozenById, userRoles } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период в допустимом состоянии для заморозки
    const allowedStates = ['EVALUATIONS_DONE', 'PLAN_FIXED', 'FACT_LOADED', 'PERIOD_REOPENED'];
    if (!allowedStates.includes(period.state.value)) {
      throw new DomainStateError(
        `Cannot freeze financials in period state "${period.state.value}". ` +
          `Period must be in one of: ${allowedStates.join(', ')}.`,
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Получаем все строки личных отчётов периода
    const personalReports = await this.personalReportRepository.findByPeriodId(periodId);

    if (personalReports.length === 0) {
      throw new NotFoundError('PersonalReport', `periodId=${periodId}`);
    }

    // 4. Устанавливаем флаг заморозки для каждой строки
    const frozenLineIds: string[] = [];
    let totalCostBeforeFreeze = 0;
    let totalCostAfterFreeze = 0;

    for (const report of personalReports) {
      // Суммируем totalWithTax до заморозки
      totalCostBeforeFreeze += report.totalWithTax?.kopecks ?? 0;

      // TODO: Установить флаг frozen в persistence
      // Пока просто собираем ID
      frozenLineIds.push(report.id);

      // Суммируем totalWithTax после заморозки
      totalCostAfterFreeze += report.totalWithTax?.kopecks ?? 0;
    }

    // 5. Логируем аудит
    await this.auditLogger.log({
      userId: frozenById,
      action: 'FREEZE_FINANCIALS',
      entityType: 'ReportingPeriod',
      entityId: periodId,
      details: {
        frozenLineCount: frozenLineIds.length,
        totalCostBeforeFreeze,
        totalCostAfterFreeze,
      },
    });

    // 6. Возвращаем результат
    return {
      periodId,
      frozenLineIds,
      frozenCount: frozenLineIds.length,
      totalCostBeforeFreeze,
      totalCostAfterFreeze,
      frozenAt: new Date().toISOString(),
    };
  }
}
