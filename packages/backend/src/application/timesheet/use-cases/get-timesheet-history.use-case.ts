/**
 * GetTimesheetHistoryUseCase
 *
 * Возвращает историю статусных переходов таймшита.
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Возвращает массив TimesheetStatusTransitionEntity из истории
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { TimesheetStatusTransition } from '../../../domain/entities/timesheet-status-transition.entity';

export class GetTimesheetHistoryUseCase {
  constructor(
    private readonly timesheetRepository: ITimesheetRepository,
  ) {}

  async execute(timesheetId: string): Promise<TimesheetStatusTransition[]> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Возвращаем историю переходов
    return timesheet.history;
  }
}
