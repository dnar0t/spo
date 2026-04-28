/**
 * UpdateRowUseCase
 *
 * Обновляет существующую строку таймшита.
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Вызывает entity.updateRow() с переданными данными
 * - Сохраняет таймшит через репозиторий
 * - Возвращает обновлённый TimesheetEntity
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { UpdateTimesheetRowDto } from '../dto/update-timesheet-row.dto';
import { Timesheet } from '../../../domain/entities/timesheet.entity';

export class UpdateRowUseCase {
  constructor(private readonly timesheetRepository: ITimesheetRepository) {}

  async execute(
    timesheetId: string,
    rowId: string,
    dto: UpdateTimesheetRowDto,
    actorId: string,
  ): Promise<Timesheet> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Вызываем доменный метод обновления строки
    timesheet.updateRow(
      rowId,
      {
        minutes: dto.minutes,
        comment: dto.comment ?? null,
        managerGrade: dto.managerGrade,
        businessGrade: dto.businessGrade,
      },
      actorId,
    );

    // 3. Сохраняем через репозиторий
    await this.timesheetRepository.save(timesheet);

    // 4. Возвращаем обновлённый entity
    return timesheet;
  }
}
