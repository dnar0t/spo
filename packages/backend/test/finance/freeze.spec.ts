import { ReportingPeriod } from '../../src/domain/entities/reporting-period.entity';
import { PeriodSnapshot } from '../../src/domain/entities/period-snapshot.entity';
import { PeriodState } from '../../src/domain/value-objects/period-state.vo';

describe('Freeze Financials', () => {
  describe('PeriodSnapshot — заморозка финансовых данных', () => {
    it('после создания (freeze) snapshot содержит periodId', () => {
      const snapshot = PeriodSnapshot.create({
        periodId: 'period-freeze-1',
        employeeRates: { 'user-1': { hourlyRate: 1500 } },
        formulas: { overhead: 'dev * 0.2' },
        evaluationScales: { quality: [1, 2, 3, 4, 5] },
        workItems: { items: [] },
        issues: { 'PROJ-42': { summary: 'Implement feature X' } },
        issueHierarchy: { 'PROJ-42': { parent: null } },
        reportLines: { lines: [] },
        aggregates: { totalDev: 480, totalTest: 0 },
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.periodId).toBe('period-freeze-1');
    });

    it('snapshot хранит все employeeRates на момент заморозки', () => {
      const rates = {
        'user-1': { hourlyRate: 1500 },
        'user-2': { hourlyRate: 2000 },
        'user-3': { hourlyRate: 1800 },
      };

      const snapshot = PeriodSnapshot.create({
        periodId: 'period-freeze-2',
        employeeRates: rates,
        formulas: {},
        evaluationScales: {},
        workItems: { items: [] },
        issues: {},
        issueHierarchy: {},
        reportLines: { lines: [] },
        aggregates: {},
      });

      const snapshotRates = snapshot.employeeRates;
      expect(snapshotRates).toEqual(rates);
      expect(Object.keys(snapshotRates).length).toBe(3);
    });

    it('snapshot хранит aggregates (финансовые агрегаты) на момент заморозки', () => {
      const aggregates = {
        totalDev: 480,
        totalTest: 120,
        totalFact: 600,
        totalBaseAmount: 90000000, // 900 000 руб в копейках
        totalOnHand: 75000000,
        totalNdf: 11700000,
        totalInsurance: 2700000,
        totalWithTax: 89400000,
      };

      const snapshot = PeriodSnapshot.create({
        periodId: 'period-freeze-3',
        employeeRates: {},
        formulas: {},
        evaluationScales: {},
        workItems: { items: [] },
        issues: {},
        issueHierarchy: {},
        reportLines: { lines: [] },
        aggregates,
      });

      expect(snapshot.aggregates).toEqual(aggregates);
      expect((snapshot.aggregates as Record<string, unknown>).totalBaseAmount).toBe(90000000);
    });
  });

  describe('ReportingPeriod — флаг frozen через PERIOD_CLOSED', () => {
    it('после перехода в PERIOD_CLOSED период считается frozen', () => {
      const period = ReportingPeriod.create({
        id: 'period-freeze-4',
        month: 3,
        year: 2025,
        createdById: 'user-1',
      });

      // До закрытия период не frozen
      expect(period.isClosed()).toBe(false);
      expect(period.canEditPlan()).toBe(true);

      // Закрываем период (freeze)
      period.transitionTo(PeriodState.periodClosed(), 'user-1');

      // После закрытия — frozen
      expect(period.isClosed()).toBe(true);
      expect(period.canEditPlan()).toBe(false);
    });

    it('closedAt установлен после перехода в PERIOD_CLOSED', () => {
      const period = ReportingPeriod.create({
        id: 'period-freeze-5',
        month: 4,
        year: 2025,
        createdById: 'user-2',
      });

      // До закрытия closedAt должен быть null
      expect(period.closedAt).toBeNull();

      // Закрываем период
      period.transitionTo(PeriodState.periodClosed(), 'user-2');

      // После закрытия closedAt должен быть установлен
      expect(period.closedAt).toBeInstanceOf(Date);
      expect(period.closedAt!.getTime()).toBeGreaterThan(0);
    });

    it('closedAt запоминает точное время заморозки', () => {
      const period = ReportingPeriod.create({
        id: 'period-freeze-6',
        month: 5,
        year: 2025,
        createdById: 'user-1',
      });

      const beforeFreeze = Date.now();

      // Небольшая задержка для гарантии разницы во времени
      period.transitionTo(PeriodState.periodClosed(), 'user-1');

      const afterFreeze = Date.now();

      expect(period.closedAt!.getTime()).toBeGreaterThanOrEqual(beforeFreeze);
      expect(period.closedAt!.getTime()).toBeLessThanOrEqual(afterFreeze);
    });

    it('при reopen closedAt сбрасывается (unfreeze)', () => {
      const period = ReportingPeriod.create({
        id: 'period-freeze-7',
        month: 6,
        year: 2025,
        createdById: 'user-1',
      });

      // Freeze
      period.transitionTo(PeriodState.periodClosed(), 'user-1');
      expect(period.closedAt).toBeInstanceOf(Date);

      // Unfreeze via reopen
      period.transitionTo(PeriodState.periodReopened(), 'user-2', 'Unfreeze for correction');
      expect(period.closedAt).toBeNull();
      expect(period.canEditPlan()).toBe(true);
    });
  });

  describe('Snapshot — неизменность после создания (freeze)', () => {
    it('snapshot возвращает копии данных, защищая оригинал от мутаций', () => {
      const snapshot = PeriodSnapshot.create({
        periodId: 'period-freeze-8',
        employeeRates: { 'user-1': { hourlyRate: 1500 } },
        formulas: { overhead: 'dev * 0.2' },
        evaluationScales: { quality: [1, 2, 3, 4, 5] },
        workItems: { items: [] },
        issues: { 'PROJ-42': { summary: 'Implement feature X' } },
        issueHierarchy: { 'PROJ-42': { parent: null } },
        reportLines: { lines: [] },
        aggregates: { totalDev: 480 },
      });

      // Пытаемся мутировать полученные данные
      const rates = snapshot.employeeRates;
      (rates['user-1'] as Record<string, unknown>).hourlyRate = 9999;

      // Оригинал не изменился
      const ratesAgain = snapshot.employeeRates;
      expect((ratesAgain['user-1'] as Record<string, unknown>).hourlyRate).toBe(1500);
    });
  });
});
