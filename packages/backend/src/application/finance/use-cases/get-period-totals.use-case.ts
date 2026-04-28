/**
 * GetPeriodTotalsUseCase
 *
 * Возвращает итоговые финансовые суммы по всем сотрудникам за период.
 * Агрегирует данные из PersonalReport: общие затраты, налоги, резервы,
 * эффективная ставка и проценты.
 *
 * TODO: Полная реализация группировки требует доступа к issue hierarchy
 * через YouTrackIssueRepository. Сейчас — заглушка с базовой агрегацией.
 */
import { PrismaReportingPeriodRepository } from '../../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface PeriodTotalsResult {
  periodId: string;
  periodTitle: string;
  /** Общее количество сотрудников с отчётами */
  totalEmployees: number;
  /** Общее количество строк отчётов */
  totalReportLines: number;
  /** Суммарное запланированное время (в минутах) */
  totalPlannedMinutes: number;
  /** Суммарное фактическое время (в минутах) */
  totalActualMinutes: number;
  /** Базовая сумма оплаты (копейки) */
  totalBaseAmount: number;
  /** Сумма оценки руководителя (копейки) */
  totalManagerAmount: number;
  /** Сумма оценки бизнеса (копейки) */
  totalBusinessAmount: number;
  /** Итого на руки (копейки) */
  totalOnHand: number;
  /** НДФЛ (копейки) */
  totalNdfl: number;
  /** Страховые взносы (копейки) */
  totalInsurance: number;
  /** Резерв отпусков (копейки) */
  totalReserveVacation: number;
  /** Итого с налогами (копейки) */
  totalWithTax: number;
  /** Средневзвешенная эффективная ставка */
  averageEffectiveRate: number | null;
}

export class GetPeriodTotalsUseCase {
  constructor(
    private readonly periodRepo: PrismaReportingPeriodRepository,
    private readonly personalReportRepo: PrismaPersonalReportRepository,
  ) {}

  async execute(periodId: string): Promise<PeriodTotalsResult> {
    // 1. Проверяем, что период существует
    const period = await this.periodRepo.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Получаем все строки личных отчётов периода
    const reports = await this.personalReportRepo.findByPeriodId(periodId);

    // 3. Агрегируем суммы
    const totalBaseAmount = reports.reduce((sum, r) => sum + (r.baseAmount?.kopecks ?? 0), 0);
    const totalManagerAmount = reports.reduce((sum, r) => sum + (r.managerAmount?.kopecks ?? 0), 0);
    const totalBusinessAmount = reports.reduce((sum, r) => sum + (r.businessAmount?.kopecks ?? 0), 0);
    const totalOnHand = reports.reduce((sum, r) => sum + (r.totalOnHand?.kopecks ?? 0), 0);
    const totalNdfl = reports.reduce((sum, r) => sum + (r.ndfl?.kopecks ?? 0), 0);
    const totalInsurance = reports.reduce((sum, r) => sum + (r.insurance?.kopecks ?? 0), 0);
    const totalReserveVacation = reports.reduce((sum, r) => sum + (r.reserveVacation?.kopecks ?? 0), 0);
    const totalWithTax = reports.reduce((sum, r) => sum + (r.totalWithTax?.kopecks ?? 0), 0);

    // Средневзвешенная эффективная ставка
    const ratesWithWeight = reports
      .filter(r => r.effectiveRate !== null && r.baseAmount?.kopecks && r.baseAmount.kopecks > 0)
      .map(r => ({
        rate: r.effectiveRate!,
        weight: r.baseAmount!.kopecks,
      }));
    const totalWeight = ratesWithWeight.reduce((s, r) => s + r.weight, 0);
    const averageEffectiveRate = totalWeight > 0
      ? ratesWithWeight.reduce((s, r) => s + r.rate * r.weight, 0) / totalWeight
      : null;

    // Подсчитываем уникальных сотрудников
    const uniqueUserIds = new Set(reports.map(r => r.userId));

    // 4. Возвращаем результат
    return {
      periodId,
      periodTitle: `${String(period.month).padStart(2, '0')}.${period.year}`,
      totalEmployees: uniqueUserIds.size,
      totalReportLines: reports.length,
      totalPlannedMinutes: reports.reduce((sum, r) => sum + r.totalPlannedMinutes.minutes, 0),
      totalActualMinutes: reports.reduce((sum, r) => sum + r.totalActualMinutes.minutes, 0),
      totalBaseAmount,
      totalManagerAmount,
      totalBusinessAmount,
      totalOnHand,
      totalNdfl,
      totalInsurance,
      totalReserveVacation,
      totalWithTax,
      averageEffectiveRate,
    };
  }
}
