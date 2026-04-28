/**
 * GetRatesUseCase
 *
 * Use case для получения текущей ставки и истории ставок сотрудника.
 */
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { RateResponseDto } from '../dto/rate-response.dto';

export class GetRatesUseCase {
  constructor(
    private readonly employeeRateRepository: EmployeeRateRepository,
  ) {}

  /**
   * Получить текущую (активную) ставку сотрудника
   */
  async getCurrent(userId: string): Promise<RateResponseDto | null> {
    const rate = await this.employeeRateRepository.findEffectiveByUserId(
      userId,
      new Date(),
    );

    if (!rate) return null;

    return {
      id: rate.id,
      userId: rate.userId,
      monthlySalary: rate.monthlySalary.rubles,
      annualHours: rate.annualHours / 60,
      hourlyRate: rate.hourlyRate.rublesPerHour,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      effectiveTo: rate.effectiveTo?.toISOString() ?? null,
      changedById: rate.changedById,
      changeReason: rate.changeReason,
      createdAt: rate.createdAt.toISOString(),
    };
  }

  /**
   * Получить историю ставок сотрудника
   */
  async getHistory(userId: string): Promise<RateResponseDto[]> {
    const rates = await this.employeeRateRepository.findHistoryByUserId(userId);

    // Сортировка: от новых к старым
    rates.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    return rates.map(rate => ({
      id: rate.id,
      userId: rate.userId,
      monthlySalary: rate.monthlySalary.rubles,
      annualHours: rate.annualHours / 60,
      hourlyRate: rate.hourlyRate.rublesPerHour,
      effectiveFrom: rate.effectiveFrom.toISOString(),
      effectiveTo: rate.effectiveTo?.toISOString() ?? null,
      changedById: rate.changedById,
      changeReason: rate.changeReason,
      createdAt: rate.createdAt.toISOString(),
    }));
  }
}
