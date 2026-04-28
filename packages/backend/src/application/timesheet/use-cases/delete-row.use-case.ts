/**
 * DeleteRowUseCase
 *
 * Удаляет строку из таймшита.
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Вызывает entity.removeRow()
 * - Сохраняет таймшит через репозиторий
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export class DeleteRowUseCase {
  constructor(private readonly timesheetRepository: ITimesheetRepository) {}

  async execute(
    timesheetId: string,
    rowId: string,
    actorId: string,
  ): Promise<void> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Вызываем доменный метод удаления строки
    timesheet.removeRow(rowId);

    // 3. Сохраняем через репозиторий
    await this.timesheetRepository.save(timesheet);
  }
}
