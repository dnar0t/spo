/**
 * CreateRateUseCase
 *
 * Use case для создания/обновления ставки сотрудника.
 * Деактивирует предыдущую активную ставку и логирует действие в аудит.
 */
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { EmployeeRate } from '../../../domain/entities/employee-rate.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { CreateRateDto } from '../dto/create-rate.dto';
import { RateResponseDto } from '../dto/rate-response.dto';

export class CreateRateUseCase {
  constructor(
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: CreateRateDto & { userId: string; changedById: string },
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<RateResponseDto> {
    // 1. Конвертация входных данных
    // Поддерживаем как старые имена полей (monthlySalary, annualHours),
    // так и новые (monthlyNetRub, workHoursPerYear)
    const monthlySalaryRub = dto.monthlySalary ?? dto.monthlyNetRub;
    const annualHours = dto.annualHours ?? dto.workHoursPerYear;

    const monthlySalaryKopecks = Math.round(monthlySalaryRub * 100);
    const annualMinutes = Math.round(annualHours * 60);
    const effectiveFrom = new Date(dto.effectiveFrom);

    if (isNaN(effectiveFrom.getTime())) {
      throw new Error(`Invalid effectiveFrom date: ${dto.effectiveFrom}`);
    }

    if (monthlySalaryKopecks <= 0) {
      throw new Error('Monthly salary must be positive');
    }

    if (annualMinutes <= 0) {
      throw new Error('Annual hours must be positive');
    }

    // 2. Деактивация предыдущей активной ставки
    const previousRate = await this.employeeRateRepository.findEffectiveByUserId(
      dto.userId,
      new Date(),
    );

    if (previousRate) {
      previousRate.deactivate(new Date(effectiveFrom.getTime() - 86400000)); // за день до новой
      await this.employeeRateRepository.update(previousRate);
    }

    // 3. Создание новой ставки
    const rate = EmployeeRate.create({
      userId: dto.userId,
      monthlySalary: Money.fromKopecks(monthlySalaryKopecks),
      annualHours: annualMinutes,
      effectiveFrom,
      changedById: dto.changedById,
      changeReason: dto.changeReason ?? null,
    });

    const savedRate = await this.employeeRateRepository.save(rate);

    // 4. Аудит
    await this.auditLogger.log({
      userId: dto.changedById,
      action: 'RATE_CREATED',
      entityType: 'EmployeeRateHistory',
      entityId: savedRate.id,
      details: {
        userId: dto.userId,
        monthlySalary: monthlySalaryKopecks,
        annualHours: annualMinutes,
        hourlyRate: savedRate.hourlyRate.kopecksPerHour,
        effectiveFrom: dto.effectiveFrom,
        changeReason: dto.changeReason,
        previousRateId: previousRate?.id ?? null,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 5. Формирование ответа
    return {
      id: savedRate.id,
      userId: savedRate.userId,
      monthlySalary: savedRate.monthlySalary.rubles,
      monthlyNetRub: savedRate.monthlySalary.rubles,
      annualHours: savedRate.annualHours / 60,
      workHoursPerYear: savedRate.annualHours / 60,
      hourlyRate: savedRate.hourlyRate.rublesPerHour,
      effectiveFrom: savedRate.effectiveFrom.toISOString(),
      effectiveTo: savedRate.effectiveTo?.toISOString() ?? null,
      changedById: savedRate.changedById,
      changeReason: savedRate.changeReason,
      createdAt: savedRate.createdAt.toISOString(),
    };
  }
}
