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
import { PlanningSettingsRepository } from '../../../domain/repositories/planning-settings.repository';
import {
  CapacityCalculator,
  CapacityCalculationResult,
} from '../../../domain/services/capacity-calculator.service';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { Minutes } from '../../../domain/value-objects/minutes.vo';

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
    private readonly planningSettingsRepository?: PlanningSettingsRepository,
  ) {
    this.capacityCalculator = new CapacityCalculator();
  }

  async execute(periodId: string): Promise<CapacitySummary> {
    // 1. Prob
    const period = await this.reportingPeriodRepository.findById(periodId);
    let config;
    if (period) {
      config = {
        workHoursPerMonth: period.workHoursPerMonth ?? 168,
        reservePercent: period.reservePercent ?? Percentage.fromPercent(30),
        yellowThreshold: period.yellowThreshold ?? Percentage.fromPercent(80),
        redThreshold: period.redThreshold ?? Percentage.fromPercent(100),
        employeeFilter: period.employeeFilter ?? [],
      };
    } else if (this.planningSettingsRepository) {
      let settings = await this.planningSettingsRepository.findById(periodId);
      if (!settings) {
        settings = await this.planningSettingsRepository.findLatest();
      }
      if (settings) {
        config = {
          workHoursPerMonth: settings.workHoursPerMonth ?? 168,
          reservePercent: settings.reservePercent !== null
            ? Percentage.fromBasisPoints(settings.reservePercent)
            : Percentage.fromPercent(30),
          yellowThreshold: settings.yellowThreshold !== null
            ? Percentage.fromBasisPoints(settings.yellowThreshold)
            : Percentage.fromPercent(80),
          redThreshold: settings.redThreshold !== null
            ? Percentage.fromBasisPoints(settings.redThreshold)
            : Percentage.fromPercent(100),
          employeeFilter: [],
        };
      } else {
        config = {};
        config.workHoursPerMonth = 168;
        config.reservePercent = Percentage.fromPercent(30);
        config.yellowThreshold = Percentage.fromPercent(80);
        config.redThreshold = Percentage.fromPercent(100);
        config.employeeFilter = [];
      }
    } else {
      config = {};
      config.workHoursPerMonth = 168;
      config.reservePercent = Percentage.fromPercent(30);
      config.yellowThreshold = Percentage.fromPercent(80);
      config.redThreshold = Percentage.fromPercent(100);
      config.employeeFilter = [];
    }
    let allUsers = await this.userRepository.findAllActive();
    if (config.employeeFilter.length > 0) {
      allUsers = allUsers.filter((user) => config.employeeFilter.includes(user.id));
    }
    allUsers = allUsers.filter((user) => user.canPlan === true);
    const employeeCapacities = [];
    for (const user of allUsers) {
      const assignedTasks = await this.plannedTaskRepository.findAssignedToUser(user.id, periodId);
      let totalPlannedMinutes = Minutes.zero();
      for (const task of assignedTasks) {
        totalPlannedMinutes = totalPlannedMinutes.add(task.totalPlannedMinutes);
      }
      const result = this.capacityCalculator.calculate(
        {
          employeeId: user.id,
          workHoursPerMonth: config.workHoursPerMonth,
          reservePercent: config.reservePercent,
          plannedMinutes: totalPlannedMinutes,
        },
        config.yellowThreshold,
        config.redThreshold,
      );
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
    return {
      employees: employeeCapacities,
      totalAvailableHours,
      totalPlannedHours,
      totalLoadPercent: totalLoadPercent.percent,
      employeeCount: employeeCapacities.length,
    };
  }

  private getDefaultConfig() {
    return {
      workHoursPerMonth: 168,
      reservePercent: Percentage.fromPercent(30),
      yellowThreshold: Percentage.fromPercent(80),
      redThreshold: Percentage.fromPercent(100),
      employeeFilter: [],
    };
  }
}
