/**
 * UpdatePeriodUseCase
 *
 * Обновляет настройки существующего отчётного периода.
 * - Проверяет, что период существует
 * - Проверяет, что период находится в editable состоянии (PLANNING или PERIOD_REOPENED)
 * - Применяет изменения через бизнес-методы доменной сущности
 * - Сохраняет через репозиторий
 * - Возвращает PeriodResponseDto
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { ReportingPeriod } from '../../../domain/entities/reporting-period.entity';
import { Percentage } from '../../../domain/value-objects/percentage.vo';
import { UpdatePeriodDto } from '../dto/update-period.dto';
import { PeriodResponseDto } from '../dto/period-response.dto';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export class UpdatePeriodUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
  ) {}

  async execute(periodId: string, dto: UpdatePeriodDto): Promise<PeriodResponseDto> {
    // 1. Находим период по ID
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период в editable состоянии
    if (!period.canEditPlan()) {
      throw new DomainStateError(
        `Cannot update period ${periodId}: current state is "${period.state.value}". ` +
        'Period must be in PLANNING or PERIOD_REOPENED state.',
      );
    }

    // 3. Применяем изменения через бизнес-методы доменной сущности
    if (dto.workHoursPerMonth !== undefined) {
      period.updateWorkHours(dto.workHoursPerMonth);
    }

    if (
      dto.reservePercent !== undefined ||
      dto.testPercent !== undefined ||
      dto.debugPercent !== undefined ||
      dto.mgmtPercent !== undefined
    ) {
      period.updatePercentages({
        reservePercent:
          dto.reservePercent !== undefined
            ? Percentage.fromBasisPoints(dto.reservePercent)
            : undefined,
        testPercent:
          dto.testPercent !== undefined
            ? Percentage.fromBasisPoints(dto.testPercent)
            : undefined,
        debugPercent:
          dto.debugPercent !== undefined
            ? Percentage.fromBasisPoints(dto.debugPercent)
            : undefined,
        mgmtPercent:
          dto.mgmtPercent !== undefined
            ? Percentage.fromBasisPoints(dto.mgmtPercent)
            : undefined,
      });
    }

    if (dto.yellowThreshold !== undefined || dto.redThreshold !== undefined) {
      const yellow =
        dto.yellowThreshold !== undefined
          ? Percentage.fromBasisPoints(dto.yellowThreshold)
          : period.yellowThreshold;
      const red =
        dto.redThreshold !== undefined
          ? Percentage.fromBasisPoints(dto.redThreshold)
          : period.redThreshold;
      period.updateThresholds(yellow, red);
    }

    if (dto.businessGroupingLevel !== undefined) {
      period.updateGroupingLevel(dto.businessGroupingLevel);
    }

    if (
      dto.employeeFilter !== undefined ||
      dto.projectFilter !== undefined ||
      dto.priorityFilter !== undefined
    ) {
      period.updateFilters({
        employeeFilter:
          dto.employeeFilter !== undefined ? dto.employeeFilter : undefined,
        projectFilter:
          dto.projectFilter !== undefined ? dto.projectFilter : undefined,
        priorityFilter:
          dto.priorityFilter !== undefined ? dto.priorityFilter : undefined,
      });
    }

    // 4. Сохраняем через репозиторий
    const saved = await this.reportingPeriodRepository.update(period);

    // 5. Возвращаем DTO
    return PeriodResponseDto.fromDomain(saved);
  }
}
