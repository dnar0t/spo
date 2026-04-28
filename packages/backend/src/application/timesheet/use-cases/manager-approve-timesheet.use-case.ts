/**
 * ManagerApproveTimesheetUseCase
 *
 * Согласование таймшита руководителем (submitted → manager_approved).
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Вызывает entity.managerApprove(actorId) для перехода статуса
 * - Сохраняет таймшит через репозиторий
 * - Возвращает обновлённый TimesheetEntity
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { Timesheet } from '../../../domain/entities/timesheet.entity';

export class ManagerApproveTimesheetUseCase {
  constructor(private readonly timesheetRepository: ITimesheetRepository) {}

  async execute(
    timesheetId: string,
    actorId: string,
  ): Promise<Timesheet> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Вызываем доменный метод согласования руководителем
    timesheet.managerApprove(actorId);

    // 3. Сохраняем через репозиторий
    await this.timesheetRepository.save(timesheet);

    // 4. Возвращаем обновлённый entity
    return timesheet;
  }
}
