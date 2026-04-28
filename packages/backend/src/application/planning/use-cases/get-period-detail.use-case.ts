/**
 * GetPeriodDetailUseCase
 *
 * Возвращает детальную информацию об отчётном периоде по его ID.
 * - Проверяет, что период существует
 * - Преобразует в PeriodResponseDto
 * - Возвращает DTO
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PeriodResponseDto } from '../dto/period-response.dto';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class GetPeriodDetailUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
  ) {}

  async execute(periodId: string): Promise<PeriodResponseDto> {
    // 1. Находим период по ID
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Возвращаем DTO
    return PeriodResponseDto.fromDomain(period);
  }
}
