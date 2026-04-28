/**
 * RejectTimesheetUseCase
 *
 * Отклоняет таймшит из любого активного статуса в rejected.
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Вызывает entity.reject(actorId, comment) для перехода статуса
 * - Сохраняет таймшит через репозиторий
 * - Возвращает обновлённый TimesheetEntity
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { Timesheet } from '../../../domain/entities/timesheet.entity';

export class RejectTimesheetUseCase {
  constructor(private readonly timesheetRepository: ITimesheetRepository) {}

  async execute(
    timesheetId: string,
    actorId: string,
    comment: string,
  ): Promise<Timesheet> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Вызываем доменный метод отклонения таймшита
    timesheet.reject(actorId, comment);

    // 3. Сохраняем через репозиторий
    await this.timesheetRepository.save(timesheet);

    // 4. Возвращаем обновлённый entity
    return timesheet;
  }
}
