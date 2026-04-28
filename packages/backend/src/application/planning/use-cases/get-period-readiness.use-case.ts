import { PrismaReportingPeriodRepository } from '../../../infrastructure/prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../../../infrastructure/prisma/repositories/prisma-personal-report.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import type { PeriodStateValue } from '../../../domain/value-objects/period-state.vo';

export interface PeriodReadinessItem {
  name: string;
  passed: boolean;
  details?: string;
}

export interface PeriodReadinessResult {
  periodId: string;
  state: string;
  items: PeriodReadinessItem[];
  allPassed: boolean;
}

export class GetPeriodReadinessUseCase {
  constructor(
    private readonly periodRepo: PrismaReportingPeriodRepository,
    private readonly personalReportRepo: PrismaPersonalReportRepository,
  ) {}

  async execute(periodId: string): Promise<PeriodReadinessResult> {
    const period = await this.periodRepo.findById(periodId);
    if (!period) throw new NotFoundError('ReportingPeriod', periodId);

    const stateValue = period.state.value as PeriodStateValue;

    const items: PeriodReadinessItem[] = [];

    // 1. План зафиксирован?
    const planFixedStates: PeriodStateValue[] = [
      'PLAN_FIXED',
      'FACT_LOADED',
      'EVALUATIONS_DONE',
      'PERIOD_CLOSED',
    ];
    const planFixed = planFixedStates.includes(stateValue);
    items.push({
      name: 'planFixed',
      passed: planFixed,
      details: planFixed ? 'План зафиксирован' : 'План не зафиксирован',
    });

    // 2. Все табели отправлены? (TODO: добавить проверку табелей)
    items.push({
      name: 'allTimesheetsSubmitted',
      passed: true, // заглушка
      details: 'Проверка табелей будет реализована после внедрения Timesheet модуля',
    });

    // 3. Оценки проставлены? (проверка через personal reports)
    const reports = await this.personalReportRepo.findByPeriodId(periodId);
    const allEvaluated = reports.length > 0;
    items.push({
      name: 'evaluationsDone',
      passed: allEvaluated,
      details: allEvaluated ? `Сформировано ${reports.length} отчётов` : 'Отчёты не сформированы',
    });

    const allPassed = items.every((i) => i.passed);

    return {
      periodId,
      state: period.state.value,
      items,
      allPassed,
    };
  }
}
