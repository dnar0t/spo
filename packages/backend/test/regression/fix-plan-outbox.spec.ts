/**
 * Regression Test: FixPlan + Outbox Integration
 *
 * Проверяет, что фиксация плана (FixPlanUseCase):
 * 1. Записывает OutboxMessage в одной транзакции с бизнес-изменением
 * 2. Событие PlanFixedEvent сохраняется в outbox
 * 3. После успешной обработки outbox процессором — событие публикуется
 *
 * @see FixPlanUseCase — use case фиксации плана
 * @see OutboxService — сервис записи в outbox
 * @see PlanFixedEvent — доменное событие фиксации плана
 */
import { FixPlanUseCase } from '../../src/application/planning/use-cases/fix-plan.use-case';
import { ReportingPeriod } from '../../src/domain/entities/reporting-period.entity';
import { SprintPlan } from '../../src/domain/entities/sprint-plan.entity';
import { PeriodTransition } from '../../src/domain/entities/period-transition.entity';
import { PeriodState } from '../../src/domain/value-objects/period-state.vo';
import { Minutes } from '../../src/domain/value-objects/minutes.vo';
import { PlanFixedEvent } from '../../src/domain/events/plan-fixed.event';

// ─── Mocks ────────────────────────────────────────────────────────────────────

/**
 * Создаёт мок для ReportingPeriodRepository.
 */
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

/**
 * Создаёт мок для SprintPlanRepository.
 */
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

/**
 * Создаёт мок для PlannedTaskRepository.
 */
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

/**
 * Создаёт мок для PeriodTransitionRepository.
 */
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

/**
 * Создаёт мок для PrismaService.
 * $transaction принимает callback и вызывает его, передавая tx (мок Prisma.TransactionClient).
 */
function createMockPrisma() {
  const mockTx = {};
  return {
    $transaction: jest
      .fn()
      .mockImplementation(<T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(mockTx)),
  };
}

/**
 * Создаёт мок для OutboxService.
 */
function createMockOutboxService() {
  return {
    write: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Создаёт мок для EventBusService.
 */
function createMockEventBus() {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    clearSubscribers: jest.fn(),
    clearAllSubscribers: jest.fn(),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Создаёт ReportingPeriod в состоянии PLANNING для тестов.
 */
function createPlanningPeriod(
  overrides?: Partial<{
    id: string;
    month: number;
    year: number;
    createdById: string;
  }>,
): ReportingPeriod {
  return ReportingPeriod.create({
    id: overrides?.id ?? 'period-1',
    month: overrides?.month ?? 3,
    year: overrides?.year ?? 2025,
    createdById: overrides?.createdById ?? 'user-1',
  });
}

/**
 * Создаёт SprintPlan (незафиксированный) для тестов.
 */
function createSprintPlan(
  overrides?: Partial<{
    id: string;
    periodId: string;
    versionNumber: number;
    isFixed: boolean;
    totalPlannedMinutes: Minutes;
    taskCount: number;
  }>,
): SprintPlan {
  return SprintPlan.create({
    id: overrides?.id ?? 'plan-1',
    periodId: overrides?.periodId ?? 'period-1',
    versionNumber: overrides?.versionNumber ?? 1,
    isFixed: overrides?.isFixed ?? false,
    totalPlannedMinutes: overrides?.totalPlannedMinutes ?? Minutes.fromHours(40),
    taskCount: overrides?.taskCount ?? 5,
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('FixPlan + Outbox', () => {
  const PERIOD_ID = 'period-1';
  const USER_ID = 'user-1';

  it('should write outbox message in same transaction', async () => {
    // Arrange
    const period = createPlanningPeriod({ id: PERIOD_ID });
    const sprintPlan = createSprintPlan({ periodId: PERIOD_ID });

    const mockReportingPeriodRepo = createMockReportingPeriodRepo();
    const mockSprintPlanRepo = createMockSprintPlanRepo();
    const mockPlannedTaskRepo = createMockPlannedTaskRepo();
    const mockPeriodTransitionRepo = createMockPeriodTransitionRepo();
    const mockPrisma = createMockPrisma();
    const mockOutboxService = createMockOutboxService();
    const mockEventBus = createMockEventBus();

    // Настраиваем возвращаемые значения репозиториев
    mockReportingPeriodRepo.findById.mockResolvedValue(period);
    mockPlannedTaskRepo.findByPeriodId.mockResolvedValue([]);
    mockSprintPlanRepo.findByPeriodId.mockResolvedValue(null);
    mockSprintPlanRepo.save.mockImplementation((plan: SprintPlan) => Promise.resolve(plan));

    const useCase = new FixPlanUseCase(
      mockReportingPeriodRepo as any,
      mockSprintPlanRepo as any,
      mockPlannedTaskRepo as any,
      mockPeriodTransitionRepo as any,
      mockEventBus as any,
      mockPrisma as any,
      mockOutboxService as any,
    );

    // Act
    const result = await useCase.execute(PERIOD_ID, USER_ID);

    // Assert
    // 1. OutboxService.write был вызван
    expect(mockOutboxService.write).toHaveBeenCalled();

    // 2. write был вызван с правильными параметрами внутри транзакции
    expect(mockOutboxService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'ReportingPeriod',
        aggregateId: PERIOD_ID,
        eventName: PlanFixedEvent.name,
        payload: expect.objectContaining({
          periodId: PERIOD_ID,
          fixedByUserId: USER_ID,
        }),
      }),
      expect.anything(), // tx — Prisma.TransactionClient
    );

    // 3. Вызов write произошёл внутри $transaction
    expect(mockPrisma.$transaction).toHaveBeenCalled();

    // 4. SprintPlanRepository.save был вызван
    expect(mockSprintPlanRepo.save).toHaveBeenCalled();

    // 5. ReportingPeriodRepository.update был вызван
    expect(mockReportingPeriodRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PERIOD_ID,
      }),
    );

    // 6. EventBus.publish был вызван после транзакции (fire-and-forget)
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        periodId: PERIOD_ID,
        fixedByUserId: USER_ID,
      }),
    );

    // 7. Результат содержит корректные поля
    expect(result).toBeDefined();
    expect(result.sprintPlanId).toBeDefined();
    expect(result.versionNumber).toBeGreaterThan(0);
    expect(result.totalPlannedHours).toBeGreaterThanOrEqual(0);
    expect(result.taskCount).toBeGreaterThanOrEqual(0);
    expect(result.fixedAt).toBeDefined();
    expect(result.fixedByUserId).toBe(USER_ID);
  });

  it('should write outbox with PlanFixedEvent eventName', async () => {
    // Arrange
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
    mockSprintPlanRepo.save.mockImplementation((plan: SprintPlan) => Promise.resolve(plan));

    const useCase = new FixPlanUseCase(
      mockReportingPeriodRepo as any,
      mockSprintPlanRepo as any,
      mockPlannedTaskRepo as any,
      mockPeriodTransitionRepo as any,
      mockEventBus as any,
      mockPrisma as any,
      mockOutboxService as any,
    );

    // Act
    await useCase.execute(PERIOD_ID, USER_ID);

    // Assert — проверяем, что событие в outbox имеет правильный тип
    expect(mockOutboxService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'PlanFixedEvent',
        payload: expect.objectContaining({
          periodId: PERIOD_ID,
          versionNumber: expect.any(Number),
          fixedByUserId: USER_ID,
          totalPlannedMinutes: expect.any(Number),
          taskCount: expect.any(Number),
        }),
      }),
      expect.anything(),
    );
  });

  it('should publish event after successful transaction', async () => {
    // Arrange
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
    mockSprintPlanRepo.save.mockImplementation((plan: SprintPlan) => Promise.resolve(plan));

    // Счётчик для проверки порядка: транзакция → eventBus.publish
    let callOrder = 0;
    let transactionCallOrder = -1;
    let publishCallOrder = -1;

    mockPrisma.$transaction.mockImplementation(<T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      transactionCallOrder = callOrder++;
      return fn({});
    });
    mockEventBus.publish.mockImplementation(() => {
      publishCallOrder = callOrder++;
      return Promise.resolve();
    });

    const useCase = new FixPlanUseCase(
      mockReportingPeriodRepo as any,
      mockSprintPlanRepo as any,
      mockPlannedTaskRepo as any,
      mockPeriodTransitionRepo as any,
      mockEventBus as any,
      mockPrisma as any,
      mockOutboxService as any,
    );

    // Act
    await useCase.execute(PERIOD_ID, USER_ID);

    // Assert
    // 1. Транзакция выполнилась первой
    expect(transactionCallOrder).toBeGreaterThanOrEqual(0);
    // 2. Публикация события произошла после транзакции
    expect(publishCallOrder).toBeGreaterThan(transactionCallOrder);
    // 3. EventBus.publish был вызван с PlanFixedEvent
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        periodId: PERIOD_ID,
        fixedByUserId: USER_ID,
        versionNumber: expect.any(Number),
        totalPlannedMinutes: expect.any(Number),
        taskCount: expect.any(Number),
      }),
    );
  });

  it('should not call outbox write when transaction fails', async () => {
    // Arrange
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

    // Имитируем ошибку в транзакции
    const transactionError = new Error('Database connection lost');
    mockPrisma.$transaction.mockRejectedValue(transactionError);

    const useCase = new FixPlanUseCase(
      mockReportingPeriodRepo as any,
      mockSprintPlanRepo as any,
      mockPlannedTaskRepo as any,
      mockPeriodTransitionRepo as any,
      mockEventBus as any,
      mockPrisma as any,
      mockOutboxService as any,
    );

    // Act / Assert
    await expect(useCase.execute(PERIOD_ID, USER_ID)).rejects.toThrow('Database connection lost');

    // OutboxService.write не должен быть вызван, т.к. транзакция не выполнилась
    expect(mockOutboxService.write).not.toHaveBeenCalled();
    // SprintPlanRepository.save не должен быть вызван
    expect(mockSprintPlanRepo.save).not.toHaveBeenCalled();
    // EventBus.publish не должен быть вызван, т.к. execute выбросил исключение
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
