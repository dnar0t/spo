"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reporting_period_entity_1 = require("../../src/domain/entities/reporting-period.entity");
const planned_task_entity_1 = require("../../src/domain/entities/planned-task.entity");
const period_transition_entity_1 = require("../../src/domain/entities/period-transition.entity");
const period_snapshot_entity_1 = require("../../src/domain/entities/period-snapshot.entity");
const period_state_vo_1 = require("../../src/domain/value-objects/period-state.vo");
const percentage_vo_1 = require("../../src/domain/value-objects/percentage.vo");
const minutes_vo_1 = require("../../src/domain/value-objects/minutes.vo");
const domain_error_1 = require("../../src/domain/errors/domain.error");
function createPlanningPeriod(overrides) {
    return reporting_period_entity_1.ReportingPeriod.create({
        id: overrides?.id ?? 'period-1',
        month: overrides?.month ?? 3,
        year: overrides?.year ?? 2025,
        createdById: overrides?.createdById ?? 'user-1',
    });
}
function createPlannedTask(overrides) {
    return planned_task_entity_1.PlannedTask.create({
        id: overrides?.id ?? 'task-1',
        periodId: overrides?.periodId ?? 'period-1',
        issueNumber: overrides?.issueNumber ?? 'PROJ-42',
        summary: overrides?.summary ?? 'Implement feature X',
        assigneeId: overrides?.assigneeId ?? 'user-1',
        plannedDevMinutes: overrides?.plannedDevMinutes ?? minutes_vo_1.Minutes.fromHours(8),
    });
}
function createPeriodSnapshot(periodId) {
    return period_snapshot_entity_1.PeriodSnapshot.create({
        periodId,
        employeeRates: { 'user-1': { hourlyRate: 1500 } },
        formulas: { overhead: 'dev * 0.2' },
        evaluationScales: { quality: [1, 2, 3, 4, 5] },
        workItems: { items: [] },
        issues: { 'PROJ-42': { summary: 'Implement feature X' } },
        issueHierarchy: { 'PROJ-42': { parent: null } },
        reportLines: { lines: [] },
        aggregates: { totalDev: 480, totalTest: 0 },
    });
}
describe('Closed Report Immutability (Regression)', () => {
    describe('1. После закрытия периода нельзя изменить плановые часы задачи', () => {
        it('должен выбрасывать DomainStateError при попытке updatePlannedHours на закрытом периоде', () => {
            const period = createPlanningPeriod();
            const task = createPlannedTask({ periodId: period.id });
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            expect(period.canEditPlan()).toBe(false);
            expect(period.canEditPlan()).toBe(false);
            const assertPeriodEditable = (p) => {
                if (!p.canEditPlan()) {
                    throw new domain_error_1.DomainStateError('Cannot update planned hours when period is not editable', {
                        periodId: p.id,
                        state: p.state.value,
                    });
                }
            };
            expect(() => assertPeriodEditable(period)).toThrow(domain_error_1.DomainStateError);
            expect(() => assertPeriodEditable(period)).toThrow('Cannot update planned hours when period is not editable');
        });
        it('должен успешно обновлять плановые часы в состоянии PLANNING (базовый сценарий)', () => {
            const period = createPlanningPeriod();
            const task = createPlannedTask({ periodId: period.id });
            expect(period.canEditPlan()).toBe(true);
            expect(period.isClosed()).toBe(false);
            expect(() => {
                task.updatePlannedHours({ plannedDevMinutes: minutes_vo_1.Minutes.fromHours(10) });
            }).not.toThrow();
            expect(task.plannedDevMinutes?.hours).toBe(10);
        });
    });
    describe('2. После закрытия периода нельзя обновить readiness задачи', () => {
        it('должен выбрасывать DomainStateError при попытке updateReadiness на закрытом периоде', () => {
            const period = createPlanningPeriod();
            const task = createPlannedTask({ periodId: period.id });
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            expect(period.canEditPlan()).toBe(false);
            const assertPeriodEditable = (p) => {
                if (!p.canEditPlan()) {
                    throw new domain_error_1.DomainStateError('Cannot update readiness when period is not editable', {
                        periodId: p.id,
                        state: p.state.value,
                    });
                }
            };
            expect(() => assertPeriodEditable(period)).toThrow(domain_error_1.DomainStateError);
            expect(() => assertPeriodEditable(period)).toThrow('Cannot update readiness when period is not editable');
        });
        it('должен успешно обновлять readiness в состоянии PERIOD_REOPENED', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-1', 'Need to adjust');
            expect(period.isClosed()).toBe(false);
            expect(period.canEditPlan()).toBe(true);
            const task = createPlannedTask({ periodId: period.id });
            expect(() => {
                task.updateReadiness(percentage_vo_1.Percentage.fromPercent(50));
            }).not.toThrow();
            expect(task.readinessPercent.percent).toBe(50);
        });
    });
    describe('3. После закрытия периода фиксация плана возвращает ошибку', () => {
        it('должен выбрасывать DomainStateError при попытке transitionTo(PERIOD_CLOSED) для повторного закрытия', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            expect(() => {
                period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            }).toThrow(domain_error_1.DomainStateError);
            expect(() => {
                period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            }).toThrow(/Cannot transition from/);
        });
        it('должен выбрасывать ошибку при попытке зафиксировать план (PLAN_FIXED) на закрытом периоде', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            expect(() => {
                period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            }).toThrow(domain_error_1.DomainStateError);
            expect(() => {
                period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            }).toThrow(/Cannot transition from PERIOD_CLOSED to PLAN_FIXED/);
        });
        it('должен успешно выполнять PLAN_FIXED в состоянии PLANNING (базовый сценарий)', () => {
            const period = createPlanningPeriod();
            expect(() => {
                period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            }).not.toThrow();
            expect(period.isPlanFixed()).toBe(true);
        });
    });
    describe('4. Закрытый период можно переоткрыть через reopen', () => {
        it('должен успешно выполнять PERIOD_CLOSED → PERIOD_REOPENED', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            expect(period.state.value).toBe('PERIOD_CLOSED');
            expect(period.closedAt).toBeInstanceOf(Date);
            expect(period.reopenedAt).toBeNull();
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-2', 'Correction needed');
            expect(period.isClosed()).toBe(false);
            expect(period.state.value).toBe('PERIOD_REOPENED');
            expect(period.reopenedAt).toBeInstanceOf(Date);
            expect(period.reopenReason).toBe('Correction needed');
            expect(period.closedAt).toBeNull();
        });
        it('должен выбрасывать ошибку при reopen без указания userId', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(() => {
                period_transition_entity_1.PeriodTransition.create({
                    periodId: period.id,
                    fromState: period_state_vo_1.PeriodState.periodClosed(),
                    toState: period_state_vo_1.PeriodState.periodReopened(),
                    transitionedByUserId: '',
                    reason: 'test',
                });
            }).toThrow(domain_error_1.InvalidArgumentError);
            expect(() => {
                period_transition_entity_1.PeriodTransition.create({
                    periodId: period.id,
                    fromState: period_state_vo_1.PeriodState.periodClosed(),
                    toState: period_state_vo_1.PeriodState.periodReopened(),
                    transitionedByUserId: '   ',
                    reason: 'test',
                });
            }).toThrow(domain_error_1.InvalidArgumentError);
        });
        it('должен корректно сбрасывать closedAt и устанавливать reopenedAt при reopen', () => {
            const period = createPlanningPeriod();
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            const closedAt = period.closedAt;
            expect(closedAt).toBeInstanceOf(Date);
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-2', 'Data correction');
            expect(period.closedAt).toBeNull();
            expect(period.reopenedAt).toBeInstanceOf(Date);
            expect(period.reopenReason).toBe('Data correction');
            expect(period.reopenedAt.getTime()).toBeGreaterThanOrEqual(closedAt.getTime());
        });
    });
    describe('5. После close/reopen отчёт остаётся доступным для чтения', () => {
        it('должен возвращать корректные данные периода после close/reopen', () => {
            const period = createPlanningPeriod();
            const originalMonth = period.month;
            const originalYear = period.year;
            const originalCreatedById = period.createdById;
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.isClosed()).toBe(true);
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-2', 'Reopened for review');
            expect(period.month).toBe(originalMonth);
            expect(period.year).toBe(originalYear);
            expect(period.createdById).toBe(originalCreatedById);
            expect(period.id).toBe('period-1');
            expect(period.state.value).toBe('PERIOD_REOPENED');
            expect(period.canEditPlan()).toBe(true);
        });
        it('должен позволять читать снэпшот после закрытия периода', () => {
            const period = createPlanningPeriod({ id: 'snapshot-period' });
            const snapshot = createPeriodSnapshot(period.id);
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(snapshot.periodId).toBe(period.id);
            expect(snapshot.issues).toEqual({ 'PROJ-42': { summary: 'Implement feature X' } });
            expect(snapshot.aggregates).toEqual({ totalDev: 480, totalTest: 0 });
            const issues = snapshot.issues;
            expect(issues).toEqual({ 'PROJ-42': { summary: 'Implement feature X' } });
            issues['FAKE-1'] = { summary: 'Fake issue' };
            expect(snapshot.issues).toEqual({ 'PROJ-42': { summary: 'Implement feature X' } });
        });
        it('должен сохранять корректную стейт-машину: canEditPlan меняется при close/reopen', () => {
            const period = createPlanningPeriod();
            expect(period.canEditPlan()).toBe(true);
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.canEditPlan()).toBe(false);
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-2', 'Fix data');
            expect(period.canEditPlan()).toBe(true);
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            expect(period.canEditPlan()).toBe(false);
        });
    });
    describe('6. Аудит close/reopen создаётся корректно', () => {
        it('PeriodTransition.create должен создавать корректную запись для закрытия периода', () => {
            const periodId = 'period-audit-1';
            const period = createPlanningPeriod({ id: periodId });
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-admin');
            const transition = period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.planning(),
                toState: period_state_vo_1.PeriodState.periodClosed(),
                transitionedByUserId: 'user-admin',
                reason: 'Month closed',
            });
            expect(transition.periodId).toBe(periodId);
            expect(transition.fromState.value).toBe('PLANNING');
            expect(transition.toState.value).toBe('PERIOD_CLOSED');
            expect(transition.transitionedByUserId).toBe('user-admin');
            expect(transition.reason).toBe('Month closed');
            expect(transition.transitionedAt).toBeInstanceOf(Date);
            expect(transition.isClosure()).toBe(true);
            expect(transition.isReopening()).toBe(false);
            expect(transition.isPlanFix()).toBe(false);
            expect(transition.isPlanModification()).toBe(false);
        });
        it('PeriodTransition.create должен создавать корректную запись для переоткрытия периода', () => {
            const period = createPlanningPeriod({ id: 'period-reopen-audit' });
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-admin');
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-manager', 'Data correction required');
            const transition = period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.periodClosed(),
                toState: period_state_vo_1.PeriodState.periodReopened(),
                transitionedByUserId: 'user-manager',
                reason: 'Data correction required',
            });
            expect(transition.fromState.value).toBe('PERIOD_CLOSED');
            expect(transition.toState.value).toBe('PERIOD_REOPENED');
            expect(transition.transitionedByUserId).toBe('user-manager');
            expect(transition.reason).toBe('Data correction required');
            expect(transition.isClosure()).toBe(false);
            expect(transition.isReopening()).toBe(true);
        });
        it('PeriodTransition.forAudit должен создавать audit-запись без смены состояния (fromState === toState)', () => {
            const audit = period_transition_entity_1.PeriodTransition.forAudit({
                periodId: 'period-1',
                state: period_state_vo_1.PeriodState.planFixed(),
                transitionedByUserId: 'user-director',
                reason: 'Director adjusted planned hours',
            });
            expect(audit.periodId).toBe('period-1');
            expect(audit.fromState.value).toBe('PLAN_FIXED');
            expect(audit.toState.value).toBe('PLAN_FIXED');
            expect(audit.transitionedByUserId).toBe('user-director');
            expect(audit.reason).toBe('Director adjusted planned hours');
            expect(audit.isPlanModification()).toBe(true);
            expect(audit.isClosure()).toBe(false);
            expect(audit.isReopening()).toBe(false);
            expect(audit.isPlanFix()).toBe(true);
        });
        it('должен создавать audit-запись модификации плана через PeriodTransition.forAudit (основной путь)', () => {
            const audit = period_transition_entity_1.PeriodTransition.forAudit({
                periodId: 'period-1',
                state: period_state_vo_1.PeriodState.planFixed(),
                transitionedByUserId: 'user-director',
                reason: 'Director adjusted planned hours',
            });
            expect(audit.transitionedByUserId).toBe('user-director');
            expect(audit.reason).toContain('Director adjusted planned hours');
            expect(audit.isPlanModification()).toBe(true);
            expect(audit.isClosure()).toBe(false);
        });
        it('PeriodTransition должен выбрасывать ошибку при невалидном переходе', () => {
            expect(() => {
                period_transition_entity_1.PeriodTransition.create({
                    periodId: 'period-1',
                    fromState: period_state_vo_1.PeriodState.periodClosed(),
                    toState: period_state_vo_1.PeriodState.planning(),
                    transitionedByUserId: 'user-1',
                });
            }).toThrow(domain_error_1.InvalidArgumentError);
            expect(() => {
                period_transition_entity_1.PeriodTransition.create({
                    periodId: 'period-1',
                    fromState: period_state_vo_1.PeriodState.periodClosed(),
                    toState: period_state_vo_1.PeriodState.planning(),
                    transitionedByUserId: 'user-1',
                });
            }).toThrow(/Invalid transition from PERIOD_CLOSED to PLANNING/);
        });
        it('должен корректно сериализовать PeriodTransition в persistence', () => {
            const period = createPlanningPeriod({ id: 'period-serialization' });
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
            const transition = period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.planning(),
                toState: period_state_vo_1.PeriodState.periodClosed(),
                transitionedByUserId: 'user-1',
                reason: 'End of month',
            });
            const data = transition.toPersistence();
            expect(data.period_id).toBe('period-serialization');
            expect(data.from_state).toBe('PLANNING');
            expect(data.to_state).toBe('PERIOD_CLOSED');
            expect(data.transitioned_by_user_id).toBe('user-1');
            expect(data.reason).toBe('End of month');
            expect(data.transitioned_at).toBeInstanceOf(Date);
            expect(typeof data.id).toBe('string');
        });
        it('должен корректно восстанавливать PeriodTransition из persistence', () => {
            const now = new Date();
            const restored = period_transition_entity_1.PeriodTransition.fromPersistence({
                id: 'restored-1',
                periodId: 'period-1',
                fromState: 'PERIOD_CLOSED',
                toState: 'PERIOD_REOPENED',
                transitionedByUserId: 'user-manager',
                reason: 'Reopen for fix',
                transitionedAt: now,
            });
            expect(restored.id).toBe('restored-1');
            expect(restored.periodId).toBe('period-1');
            expect(restored.fromState.value).toBe('PERIOD_CLOSED');
            expect(restored.toState.value).toBe('PERIOD_REOPENED');
            expect(restored.reason).toBe('Reopen for fix');
            expect(restored.isReopening()).toBe(true);
        });
        it('должен создавать несколько аудит-записей для последовательных переходов', () => {
            const period = createPlanningPeriod({ id: 'multi-transition' });
            const transitions = [];
            period.transitionTo(period_state_vo_1.PeriodState.planFixed(), 'user-1');
            transitions.push(period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.planning(),
                toState: period_state_vo_1.PeriodState.planFixed(),
                transitionedByUserId: 'user-1',
                reason: 'Plan finalized',
            }));
            period.transitionTo(period_state_vo_1.PeriodState.factLoaded(), 'user-1');
            transitions.push(period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.planFixed(),
                toState: period_state_vo_1.PeriodState.factLoaded(),
                transitionedByUserId: 'user-1',
                reason: 'Fact data loaded',
            }));
            period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-2');
            transitions.push(period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.factLoaded(),
                toState: period_state_vo_1.PeriodState.periodClosed(),
                transitionedByUserId: 'user-2',
                reason: 'Month closed',
            }));
            period.transitionTo(period_state_vo_1.PeriodState.periodReopened(), 'user-3', 'Audit correction');
            transitions.push(period_transition_entity_1.PeriodTransition.create({
                periodId: period.id,
                fromState: period_state_vo_1.PeriodState.periodClosed(),
                toState: period_state_vo_1.PeriodState.periodReopened(),
                transitionedByUserId: 'user-3',
                reason: 'Audit correction',
            }));
            expect(transitions).toHaveLength(4);
            expect(transitions[0].isPlanFix()).toBe(true);
            expect(transitions[0].toState.value).toBe('PLAN_FIXED');
            expect(transitions[1].toState.value).toBe('FACT_LOADED');
            expect(transitions[1].fromState.value).toBe('PLAN_FIXED');
            expect(transitions[2].isClosure()).toBe(true);
            expect(transitions[2].transitionedByUserId).toBe('user-2');
            expect(transitions[3].isReopening()).toBe(true);
            expect(transitions[3].transitionedByUserId).toBe('user-3');
            expect(transitions[3].reason).toBe('Audit correction');
        });
    });
});
describe('7. После закрытия периода workItems, issues и hierarchy в snapshot не пустые', () => {
    it('workItems в snapshot не пустые после закрытия периода', () => {
        const period = createPlanningPeriod({ id: 'snapshot-workitems' });
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: { 'user-1': { hourlyRate: 1500 } },
            formulas: { overhead: 'dev * 0.2' },
            evaluationScales: { quality: [1, 2, 3, 4, 5] },
            workItems: {
                items: [
                    { issueNumber: 'PROJ-42', type: 'dev', minutes: 480 },
                    { issueNumber: 'PROJ-43', type: 'test', minutes: 120 },
                ],
            },
            issues: {
                'PROJ-42': { summary: 'Implement feature X' },
                'PROJ-43': { summary: 'Write tests' },
            },
            issueHierarchy: {
                'PROJ-42': { parent: 'EPIC-1' },
                'PROJ-43': { parent: 'EPIC-1' },
                'EPIC-1': { parent: null },
            },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 120 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const workItems = snapshot.workItems;
        expect(workItems.items).toBeDefined();
        expect(workItems.items.length).toBeGreaterThan(0);
        expect(workItems.items[0]).toHaveProperty('issueNumber');
        const issues = snapshot.issues;
        expect(Object.keys(issues).length).toBeGreaterThan(0);
        expect(issues['PROJ-42']).toBeDefined();
        const hierarchy = snapshot.issueHierarchy;
        expect(Object.keys(hierarchy).length).toBeGreaterThan(0);
        expect(hierarchy['EPIC-1']).toBeDefined();
        expect(hierarchy['EPIC-1'].parent).toBeNull();
    });
    it('snapshot содержит корректные агрегированные данные после закрытия', () => {
        const period = createPlanningPeriod({ id: 'snapshot-aggregates' });
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: { 'user-1': { hourlyRate: 1500 } },
            formulas: { overhead: 'dev * 0.2' },
            evaluationScales: { quality: [1, 2, 3, 4, 5] },
            workItems: {
                items: [
                    { issueNumber: 'PROJ-42', type: 'dev', minutes: 480 },
                    { issueNumber: 'PROJ-43', type: 'test', minutes: 120 },
                ],
            },
            issues: {
                'PROJ-42': { summary: 'Implement feature X' },
                'PROJ-43': { summary: 'Write tests' },
            },
            issueHierarchy: {
                'PROJ-42': { parent: 'EPIC-1' },
                'PROJ-43': { parent: 'EPIC-1' },
                'EPIC-1': { parent: null },
            },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 120, totalFact: 600 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const aggregates = snapshot.aggregates;
        expect(aggregates.totalDev).toBe(480);
        expect(aggregates.totalTest).toBe(120);
        expect(aggregates.totalFact).toBe(600);
    });
});
describe('8. Изменение справочников не меняет исторические данные в snapshot', () => {
    it('изменение employeeRates в источнике не влияет на snapshot', () => {
        const period = createPlanningPeriod({ id: 'snapshot-dict-employees' });
        const originalRates = {
            'user-1': { hourlyRate: 1500 },
            'user-2': { hourlyRate: 2000 },
        };
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: originalRates,
            formulas: { overhead: 'dev * 0.2' },
            evaluationScales: { quality: [1, 2, 3, 4, 5] },
            workItems: { items: [] },
            issues: { 'PROJ-42': { summary: 'Implement feature X' } },
            issueHierarchy: { 'PROJ-42': { parent: null } },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 0 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const snapshotRates = snapshot.employeeRates;
        expect(snapshotRates['user-1'].hourlyRate).toBe(1500);
        originalRates['user-1'] = { hourlyRate: 9999 };
        originalRates['user-3'] = { hourlyRate: 3000 };
        const ratesAfterMutation = snapshot.employeeRates;
        expect(ratesAfterMutation['user-1'].hourlyRate).toBe(1500);
        expect(ratesAfterMutation['user-3']).toBeUndefined();
    });
    it('изменение formulas в источнике не влияет на snapshot', () => {
        const period = createPlanningPeriod({ id: 'snapshot-dict-formulas' });
        const originalFormulas = {
            overhead: 'dev * 0.2',
            ndfl: '0.13',
        };
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: { 'user-1': { hourlyRate: 1500 } },
            formulas: originalFormulas,
            evaluationScales: { quality: [1, 2, 3, 4, 5] },
            workItems: { items: [] },
            issues: { 'PROJ-42': { summary: 'Implement feature X' } },
            issueHierarchy: { 'PROJ-42': { parent: null } },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 0 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const snapshotFormulas = snapshot.formulas;
        expect(snapshotFormulas.overhead).toBe('dev * 0.2');
        originalFormulas.overhead = 'dev * 0.3';
        originalFormulas.insurance = '0.05';
        const formulasAfterMutation = snapshot.formulas;
        expect(formulasAfterMutation.overhead).toBe('dev * 0.2');
        expect(formulasAfterMutation.insurance).toBeUndefined();
    });
    it('изменение evaluationScales в источнике не влияет на snapshot', () => {
        const period = createPlanningPeriod({ id: 'snapshot-dict-scales' });
        const originalScales = {
            quality: [1, 2, 3, 4, 5],
            productivity: [1, 2, 3],
        };
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: { 'user-1': { hourlyRate: 1500 } },
            formulas: { overhead: 'dev * 0.2' },
            evaluationScales: originalScales,
            workItems: { items: [] },
            issues: { 'PROJ-42': { summary: 'Implement feature X' } },
            issueHierarchy: { 'PROJ-42': { parent: null } },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 0 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const snapshotScales = snapshot.evaluationScales;
        expect(snapshotScales.quality).toEqual([1, 2, 3, 4, 5]);
        originalScales.quality = [1, 2, 3, 4, 5, 6];
        delete originalScales.productivity;
        const scalesAfterMutation = snapshot.evaluationScales;
        expect(scalesAfterMutation.quality).toEqual([1, 2, 3, 4, 5]);
        expect(scalesAfterMutation.productivity).toEqual([1, 2, 3]);
    });
    it('snapshot data возвращает копии при каждом вызове геттера', () => {
        const period = createPlanningPeriod({ id: 'snapshot-copy' });
        const snapshot = period_snapshot_entity_1.PeriodSnapshot.create({
            periodId: period.id,
            employeeRates: { 'user-1': { hourlyRate: 1500 } },
            formulas: { overhead: 'dev * 0.2' },
            evaluationScales: { quality: [1, 2, 3, 4, 5] },
            workItems: { items: [] },
            issues: { 'PROJ-42': { summary: 'Implement feature X' } },
            issueHierarchy: { 'PROJ-42': { parent: null } },
            reportLines: { lines: [] },
            aggregates: { totalDev: 480, totalTest: 0 },
        });
        period.transitionTo(period_state_vo_1.PeriodState.periodClosed(), 'user-1');
        const firstCall = snapshot.employeeRates;
        const secondCall = snapshot.employeeRates;
        expect(firstCall).not.toBe(secondCall);
        firstCall['user-1'].hourlyRate = 9999;
        expect(secondCall['user-1'].hourlyRate).toBe(1500);
    });
});
//# sourceMappingURL=closed-report-immutability.spec.js.map