/**
 * CreatePeriodUseCase
 *
 * Создаёт новый отчётный период в системе.
 * - Проверяет, что период с таким month/year ещё не существует
 * - Создаёт ReportingPeriod через фабричный метод
 * - Сохраняет через репозиторий
 * - Возвращает PeriodResponseDto
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { ReportingPeriod } from '../../../domain/entities/reporting-period.entity';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { CreatePeriodDto } from '../dto/create-period.dto';
import { PeriodResponseDto } from '../dto/period-response.dto';
import { ConflictError, NotFoundError } from '../../../domain/errors/domain.error';

export class CreatePeriodUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: CreatePeriodDto, userId: string): Promise<PeriodResponseDto> {
    // 1. Проверяем, что пользователь существует
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // 2. Проверяем, что период с таким month/year ещё не существует
    const existing = await this.reportingPeriodRepository.findByMonthYear(dto.month, dto.year);
    if (existing) {
      throw new ConflictError(`Reporting period for ${dto.month}/${dto.year} already exists`);
    }

    // 3. Создаём период через фабричный метод доменной сущности
    const period = ReportingPeriod.create({
      month: dto.month,
      year: dto.year,
      workHoursPerMonth: dto.workHoursPerMonth ?? null,
      reservePercent:
        dto.reservePercent !== undefined
          ? Percentage.fromPercent(dto.reservePercent * 100) // float 0..1 → проценты → basis points
          : null,
      testPercent:
        dto.testPercent !== undefined
          ? Percentage.fromPercent(dto.testPercent * 100) // float 0..1 → проценты → basis points
          : null,
      debugPercent:
        dto.debugPercent !== undefined ? Percentage.fromPercent(dto.debugPercent * 100) : null,
      mgmtPercent:
        dto.mgmtPercent !== undefined ? Percentage.fromPercent(dto.mgmtPercent * 100) : null,
      yellowThreshold:
        dto.yellowThreshold !== undefined
          ? Percentage.fromPercent(dto.yellowThreshold * 100)
          : null,
      redThreshold:
        dto.redThreshold !== undefined ? Percentage.fromPercent(dto.redThreshold * 100) : null,
      businessGroupingLevel: dto.businessGroupingLevel ?? null,
      employeeFilter: dto.employeeIds ?? null,
      projectFilter: dto.projectFilter ?? null,
      priorityFilter: dto.priorityFilter ?? null,
      createdById: userId,
    });

    // 4. Сохраняем через репозиторий
    const saved = await this.reportingPeriodRepository.save(period);

    // 5. Возвращаем DTO
    return PeriodResponseDto.fromDomain(saved);
  }
}
