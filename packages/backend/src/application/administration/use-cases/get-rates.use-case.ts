/**
 * GetRatesUseCase
 *
 * Use case для получения текущей ставки и истории ставок сотрудника.
 */
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { RateResponseDto } from '../dto/rate-response.dto';

export class GetRatesUseCase {
  constructor(private readonly employeeRateRepository: EmployeeRateRepository) {}

  /**
   * Получить текущую (активную) ставку сотрудника
   */
  async getCurrent(userId: string): Promise<RateResponseDto | null> {
    const rate = await this.employeeRateRepository.findEffectiveByUserId(userId, new Date());

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
   * Получить текущие ставки для нескольких сотрудников (batch).
   * Возвращает Map<userId, RateResponseDto> для быстрого доступа.
   */
  async getCurrentBatch(employeeIds: string[]): Promise<Map<string, RateResponseDto | null>> {
    const result = new Map<string, RateResponseDto | null>();

    const allRates = await this.employeeRateRepository.findCurrentEffective();
    const rateMap = new Map<string, RateResponseDto>();

    for (const rate of allRates) {
      const dto: RateResponseDto = {
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
      rateMap.set(rate.userId, dto);
    }

    for (const employeeId of employeeIds) {
      result.set(employeeId, rateMap.get(employeeId) ?? null);
    }

    return result;
  }

  /**
   * Получить историю ставок сотрудника
   */
  async getHistory(userId: string): Promise<RateResponseDto[]> {
    const rates = await this.employeeRateRepository.findHistoryByUserId(userId);

    // Сортировка: от новых к старым
    rates.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    return rates.map((rate) => ({
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
