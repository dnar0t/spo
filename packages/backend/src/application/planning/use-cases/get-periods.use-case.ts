/**
 * GetPeriodsUseCase
 *
 * Возвращает список всех отчётных периодов с поддержкой пагинации.
 * - Загружает все периоды из репозитория
 * - Применяет пагинацию (page, limit, sort)
 * - Преобразует в PeriodResponseDto
 * - Возвращает PaginatedResult<PeriodResponseDto>
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { PeriodResponseDto } from '../dto/period-response.dto';
import {
  PaginationDto,
  PaginatedResult,
  toPaginatedResult,
} from '../../common/pagination.dto';

export class GetPeriodsUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
  ) {}

  async execute(pagination: PaginationDto): Promise<PaginatedResult<PeriodResponseDto>> {
    // 1. Загружаем все периоды, отсортированные по дате (от новых к старым)
    const periods = await this.reportingPeriodRepository.findAllOrderedByDate();

    // 2. Сортировка (если задана в пагинации)
    let sortedPeriods = [...periods];
    if (pagination.sortBy) {
      sortedPeriods.sort((a, b) => {
        let comparison = 0;
        switch (pagination.sortBy) {
          case 'month':
            comparison = a.month - b.month;
            break;
          case 'year':
            comparison = a.year - b.year;
            break;
          case 'state':
            comparison = a.state.value.localeCompare(b.state.value);
            break;
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updatedAt':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          default:
            // По умолчанию сортируем по году/месяцу (сначала новые)
            comparison = a.year !== b.year
              ? b.year - a.year
              : b.month - a.month;
        }
        return pagination.sortOrder === 'ASC' ? comparison : -comparison;
      });
    }

    // 3. Применяем пагинацию
    const total = sortedPeriods.length;
    const startIndex = (pagination.page - 1) * pagination.limit;
    const paginatedItems = sortedPeriods.slice(
      startIndex,
      startIndex + pagination.limit,
    );

    // 4. Преобразуем в DTO
    const items = paginatedItems.map((period) =>
      PeriodResponseDto.fromDomain(period),
    );

    // 5. Возвращаем результат с мета-информацией пагинации
    return toPaginatedResult(items, total, pagination);
  }
}
