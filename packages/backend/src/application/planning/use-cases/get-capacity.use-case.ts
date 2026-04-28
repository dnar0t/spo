/**
 * GetCapacityUseCase
 *
 * Рассчитывает и возвращает мощность (capacity) для всех сотрудников
 * в рамках указанного отчётного периода.
 *
 * Для каждого сотрудника:
 * - Загружает уже запланированные задачи (PlannedTask) по периоду
 * - Вычисляет raw доступное время (workHoursPerMonth в минутах)
 * - Вычитает резерв через CapacityCalculator
 * - Считает процент загрузки (planned / available)
 * - Определяет зону загрузки (GREEN / YELLOW / RED)
 *
 * Возвращает сводку по всем сотрудникам plus агрегированные метрики.
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PlannedTaskRepository } from '../../../domain/repositories/planned-task.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import {
  CapacityCalculator,
  CapacityCalculationResult,
} from '../../../domain/services/capacity-calculator.service';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { Minutes } from '../../../domain/value-objects/minutes.vo';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface EmployeeCapacitySummary {
  /** ID сотрудника */
  employeeId: string;
  /** Полное имя сотрудника */
  fullName: string | null;
  /** Доступное время в часах (с учётом резерва) */
  availableHours: number;
  /** Уже запланированное время в часах */
  plannedHours: number;
  /** Процент загрузки */
  loadPercent: number;
  /** Зона загрузки */
  loadZone: 'GREEN' | 'YELLOW' | 'RED';
  /** Количество запланированных задач */
  taskCount: number;
}

export interface CapacitySummary {
  /** Сводка по каждому сотруднику */
  employees: EmployeeCapacitySummary[];
  /** Общее доступное время (в часах) */
  totalAvailableHours: number;
  /** Общее запланированное время (в часах) */
  totalPlannedHours: number;
  /** Общий процент загрузки */
  totalLoadPercent: number;
  /** Количество сотрудников */
  employeeCount: number;
}

export class GetCapacityUseCase {
  private readonly capacityCalculator: CapacityCalculator;

  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly plannedTaskRepository: PlannedTaskRepository,
    private readonly userRepository: UserRepository,
  ) {
    this.capacityCalculator = new CapacityCalculator();
  }

  async execute(periodId: string): Promise<CapacitySummary> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Определяем параметры расчёта
    const workHoursPerMonth = period.workHoursPerMonth ?? 168; // 168 часов = 21 день × 8 часов
    const reservePercent = period.reservePercent ?? Percentage.fromPercent(30);
    const yellowThreshold = period.yellowThreshold ?? Percentage.fromPercent(80);
    const redThreshold = period.redThreshold ?? Percentage.fromPercent(100);

    // 3. Определяем, по каким сотрудникам считаем мощность
    const employeeFilter = period.employeeFilter ?? [];
    let allUsers = await this.userRepository.findAllActive();

    // Если указан фильтр по сотрудникам, применяем его
    if (employeeFilter.length > 0) {
      allUsers = allUsers.filter((user) => employeeFilter.includes(user.id));
    }

    // 4. Для каждого сотрудника загружаем задачи и рассчитываем мощность
    const employeeCapacities: EmployeeCapacitySummary[] = [];

    for (const user of allUsers) {
      // 4a. Загружаем задачи, назначенные на этого сотрудника в данном периоде
      const assignedTasks = await this.plannedTaskRepository.findAssignedToUser(user.id, periodId);

      // 4b. Суммируем запланированное время
      let totalPlannedMinutes = Minutes.zero();
      for (const task of assignedTasks) {
        totalPlannedMinutes = totalPlannedMinutes.add(task.totalPlannedMinutes);
      }

      // 4c. Рассчитываем мощность через CapacityCalculator
      const result: CapacityCalculationResult = this.capacityCalculator.calculate(
        {
          employeeId: user.id,
          workHoursPerMonth,
          reservePercent,
          plannedMinutes: totalPlannedMinutes,
        },
        yellowThreshold,
        redThreshold,
      );

      // 4d. Формируем сводку по сотруднику
      employeeCapacities.push({
        employeeId: user.id,
        fullName: user.fullName,
        availableHours: result.availableMinutes.hours,
        plannedHours: (result.loadPercent.percent * result.availableMinutes.hours) / 100,
        loadPercent: result.loadPercent.percent,
        loadZone: result.loadZone,
        taskCount: assignedTasks.length,
      });
    }

    // 5. Считаем агрегированные метрики
    const totalAvailableMinutes = employeeCapacities.reduce(
      (sum, emp) => sum + Minutes.fromHours(emp.availableHours).minutes,
      0,
    );
    const totalPlannedMinutes = employeeCapacities.reduce(
      (sum, emp) => sum + Minutes.fromHours(emp.plannedHours).minutes,
      0,
    );

    const totalAvailableHours = Math.round((totalAvailableMinutes / 60) * 100) / 100;
    const totalPlannedHours = Math.round((totalPlannedMinutes / 60) * 100) / 100;

    const totalLoadPercent =
      totalAvailableMinutes > 0
        ? Percentage.calculatePercentage(totalPlannedMinutes, totalAvailableMinutes)
        : Percentage.zero();

    // 6. Возвращаем сводку
    return {
      employees: employeeCapacities,
      totalAvailableHours,
      totalPlannedHours,
      totalLoadPercent: totalLoadPercent.percent,
      employeeCount: employeeCapacities.length,
    };
  }
}
