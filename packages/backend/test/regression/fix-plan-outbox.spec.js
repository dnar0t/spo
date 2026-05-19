"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fix_plan_use_case_1 = require("../../src/application/planning/use-cases/fix-plan.use-case");
const reporting_period_entity_1 = require("../../src/domain/entities/reporting-period.entity");
const sprint_plan_entity_1 = require("../../src/domain/entities/sprint-plan.entity");
const minutes_vo_1 = require("../../src/domain/value-objects/minutes.vo");
const plan_fixed_event_1 = require("../../src/domain/events/plan-fixed.event");
function createMockReportingPeriodRepo() {
    return {
        findById: jest.fn(),
        findByMonthYear: jest.fn(),
        findAllByYear: jest.fn(),
        findAllOrderedByDate: jest.fn(),
        findLatest: jest.fn(),
        findPreviousPeriod: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAll: jest.fn(),
    };
}
function createMockSprintPlanRepo() {
    return {
        findByPeriodId: jest.fn(),
        findVersionsByPeriodId: jest.fn(),
        findLatestVersion: jest.fn(),
        save: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
}
function createMockPlannedTaskRepo() {
    return {
        findByPeriodId: jest.fn(),
        findByIssueNumber: jest.fn(),
        findAssignedToUser: jest.fn(),
        findPlannedByPeriodId: jest.fn(),
        findUnplannedByPeriodId: jest.fn(),
        findMaxSortOrder: jest.fn(),
        deleteByPeriodId: jest.fn(),
        save: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
}
function createMockPeriodTransitionRepo() {
    return {
        findByPeriodId: jest.fn(),
        findLatestByPeriodId: jest.fn(),
        save: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
}
function createMockPrisma() {
    const mockTx = {};
    return {
        $transaction: jest
            .fn()
            .mockImplementation((fn) => fn(mockTx)),
    };
}
function createMockOutboxService() {
    return {
        write: jest.fn().mockResolvedValue(undefined),
    };
}
function createMockEventBus() {
    return {
        publish: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn(),
        clearSubscribers: jest.fn(),
        clearAllSubscribers: jest.fn(),
    };
}
function createPlanningPeriod(overrides) {
    return reporting_period_entity_1.ReportingPeriod.create({
        id: overrides?.id ?? 'period-1',
        month: overrides?.month ?? 3,
        year: overrides?.year ?? 2025,
        createdById: overrides?.createdById ?? 'user-1',
    });
}
function createSprintPlan(overrides) {
    return sprint_plan_entity_1.SprintPlan.create({
        id: overrides?.id ?? 'plan-1',
        periodId: overrides?.periodId ?? 'period-1',
        versionNumber: overrides?.versionNumber ?? 1,
        isFixed: overrides?.isFixed ?? false,
        totalPlannedMinutes: overrides?.totalPlannedMinutes ?? minutes_vo_1.Minutes.fromHours(40),
        taskCount: overrides?.taskCount ?? 5,
    });
}
describe('FixPlan + Outbox', () => {
    const PERIOD_ID = 'period-1';
    const USER_ID = 'user-1';
    it('should write outbox message in same transaction', async () => {
        const period = createPlanningPeriod({ id: PERIOD_ID });
        const sprintPlan = createSprintPlan({ periodId: PERIOD_ID });
        const mockReportingPeriodRepo = createMockReportingPeriodRepo();
        const mockSprintPlanRepo = createMockSprintPlanRepo();
        const mockPlannedTaskRepo = createMockPlannedTaskRepo();
        const mockPeriodTransitionRepo = createMockPeriodTransitionRepo();
        const mockPrisma = createMockPrisma();
        const mockOutboxService = createMockOutboxService();
        const mockEventBus = createMockEventBus();
        mockReportingPeriodRepo.findById.mockResolvedValue(period);
        mockPlannedTaskRepo.findByPeriodId.mockResolvedValue([]);
        mockSprintPlanRepo.findByPeriodId.mockResolvedValue(null);
        mockSprintPlanRepo.save.mockImplementation((plan) => Promise.resolve(plan));
        const useCase = new fix_plan_use_case_1.FixPlanUseCase(mockReportingPeriodRepo, mockSprintPlanRepo, mockPlannedTaskRepo, mockPeriodTransitionRepo, mockEventBus, mockPrisma, mockOutboxService);
        const result = await useCase.execute(PERIOD_ID, USER_ID);
        expect(mockOutboxService.write).toHaveBeenCalled();
        expect(mockOutboxService.write).toHaveBeenCalledWith(expect.objectContaining({
            aggregateType: 'ReportingPeriod',
            aggregateId: PERIOD_ID,
            eventName: plan_fixed_event_1.PlanFixedEvent.name,
            payload: expect.objectContaining({
                periodId: PERIOD_ID,
                fixedByUserId: USER_ID,
            }),
        }), expect.anything());
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockSprintPlanRepo.save).toHaveBeenCalled();
        expect(mockReportingPeriodRepo.update).toHaveBeenCalledWith(expect.objectContaining({
            id: PERIOD_ID,
        }));
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.objectContaining({
            periodId: PERIOD_ID,
            fixedByUserId: USER_ID,
        }));
        expect(result).toBeDefined();
        expect(result.sprintPlanId).toBeDefined();
        expect(result.versionNumber).toBeGreaterThan(0);
        expect(result.totalPlannedHours).toBeGreaterThanOrEqual(0);
        expect(result.taskCount).toBeGreaterThanOrEqual(0);
        expect(result.fixedAt).toBeDefined();
        expect(result.fixedByUserId).toBe(USER_ID);
    });
    it('should write outbox with PlanFixedEvent eventName', async () => {
        const period = createPlanningPeriod({ id: PERIOD_ID });
        const sprintPlan = createSprintPlan({ periodId: PERIOD_ID });
        const mockReportingPeriodRepo = createMockReportingPeriodRepo();
        const mockSprintPlanRepo = createMockSprintPlanRepo();
        const mockPlannedTaskRepo = createMockPlannedTaskRepo();
        const mockPeriodTransitionRepo = createMockPeriodTransitionRepo();
        const mockPrisma = createMockPrisma();
        const mockOutboxService = createMockOutboxService();
        const mockEventBus = createMockEventBus();
        mockReportingPeriodRepo.findById.mockResolvedValue(period);
        mockPlannedTaskRepo.findByPeriodId.mockResolvedValue([]);
        mockSprintPlanRepo.findByPeriodId.mockResolvedValue(null);
        mockSprintPlanRepo.save.mockImplementation((plan) => Promise.resolve(plan));
        const useCase = new fix_plan_use_case_1.FixPlanUseCase(mockReportingPeriodRepo, mockSprintPlanRepo, mockPlannedTaskRepo, mockPeriodTransitionRepo, mockEventBus, mockPrisma, mockOutboxService);
        await useCase.execute(PERIOD_ID, USER_ID);
        expect(mockOutboxService.write).toHaveBeenCalledWith(expect.objectContaining({
            eventName: 'PlanFixedEvent',
            payload: expect.objectContaining({
                periodId: PERIOD_ID,
                versionNumber: expect.any(Number),
                fixedByUserId: USER_ID,
                totalPlannedMinutes: expect.any(Number),
                taskCount: expect.any(Number),
            }),
        }), expect.anything());
    });
    it('should publish event after successful transaction', async () => {
        const period = createPlanningPeriod({ id: PERIOD_ID });
        const sprintPlan = createSprintPlan({ periodId: PERIOD_ID });
        const mockReportingPeriodRepo = createMockReportingPeriodRepo();
        const mockSprintPlanRepo = createMockSprintPlanRepo();
        const mockPlannedTaskRepo = createMockPlannedTaskRepo();
        const mockPeriodTransitionRepo = createMockPeriodTransitionRepo();
        const mockPrisma = createMockPrisma();
        const mockOutboxService = createMockOutboxService();
        const mockEventBus = createMockEventBus();
        mockReportingPeriodRepo.findById.mockResolvedValue(period);
        mockPlannedTaskRepo.findByPeriodId.mockResolvedValue([]);
        mockSprintPlanRepo.findByPeriodId.mockResolvedValue(null);
        mockSprintPlanRepo.save.mockImplementation((plan) => Promise.resolve(plan));
        let callOrder = 0;
        let transactionCallOrder = -1;
        let publishCallOrder = -1;
        mockPrisma.$transaction.mockImplementation((fn) => {
            transactionCallOrder = callOrder++;
            return fn({});
        });
        mockEventBus.publish.mockImplementation(() => {
            publishCallOrder = callOrder++;
            return Promise.resolve();
        });
        const useCase = new fix_plan_use_case_1.FixPlanUseCase(mockReportingPeriodRepo, mockSprintPlanRepo, mockPlannedTaskRepo, mockPeriodTransitionRepo, mockEventBus, mockPrisma, mockOutboxService);
        await useCase.execute(PERIOD_ID, USER_ID);
        expect(transactionCallOrder).toBeGreaterThanOrEqual(0);
        expect(publishCallOrder).toBeGreaterThan(transactionCallOrder);
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.objectContaining({
            periodId: PERIOD_ID,
            fixedByUserId: USER_ID,
            versionNumber: expect.any(Number),
            totalPlannedMinutes: expect.any(Number),
            taskCount: expect.any(Number),
        }));
    });
    it('should not call outbox write when transaction fails', async () => {
        const period = createPlanningPeriod({ id: PERIOD_ID });
        const mockReportingPeriodRepo = createMockReportingPeriodRepo();
        const mockSprintPlanRepo = createMockSprintPlanRepo();
        const mockPlannedTaskRepo = createMockPlannedTaskRepo();
        const mockPeriodTransitionRepo = createMockPeriodTransitionRepo();
        const mockPrisma = createMockPrisma();
        const mockOutboxService = createMockOutboxService();
        const mockEventBus = createMockEventBus();
        mockReportingPeriodRepo.findById.mockResolvedValue(period);
        mockPlannedTaskRepo.findByPeriodId.mockResolvedValue([]);
        mockSprintPlanRepo.findByPeriodId.mockResolvedValue(null);
        const transactionError = new Error('Database connection lost');
        mockPrisma.$transaction.mockRejectedValue(transactionError);
        const useCase = new fix_plan_use_case_1.FixPlanUseCase(mockReportingPeriodRepo, mockSprintPlanRepo, mockPlannedTaskRepo, mockPeriodTransitionRepo, mockEventBus, mockPrisma, mockOutboxService);
        await expect(useCase.execute(PERIOD_ID, USER_ID)).rejects.toThrow('Database connection lost');
        expect(mockOutboxService.write).not.toHaveBeenCalled();
        expect(mockSprintPlanRepo.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=fix-plan-outbox.spec.js.map