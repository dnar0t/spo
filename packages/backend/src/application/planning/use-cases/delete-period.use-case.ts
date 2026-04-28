/**
 * DeletePeriodUseCase
 *
 * Удаляет отчётный период (только в состоянии PLANNING).
 * - Проверяет, что период существует
 * - Проверяет, что период находится в состоянии PLANNING
 * - Удаляет период через репозиторий
 */
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { NotFoundError, DomainStateError } from '../../../domain/errors/domain.error';

export interface DeletePeriodResult {
  /** ID удалённого периода */
  id: string;
  /** Флаг успешного удаления */
  deleted: boolean;
}

export class DeletePeriodUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
  ) {}

  async execute(periodId: string): Promise<DeletePeriodResult> {
    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем, что период в состоянии PLANNING
    if (!period.isPlanning()) {
      throw new DomainStateError(
        `Cannot delete period ${periodId}: current state is "${period.state.value}". ` +
          'Period must be in PLANNING state to be deleted.',
        { periodId, currentState: period.state.value },
      );
    }

    // 3. Удаляем период
    await this.reportingPeriodRepository.delete(periodId);

    // 4. Возвращаем результат
    return {
      id: periodId,
      deleted: true,
    };
  }
}
