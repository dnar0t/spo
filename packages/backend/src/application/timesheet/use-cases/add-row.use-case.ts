/**
 * AddRowUseCase
 *
 * Добавляет новую строку в таймшит.
 * - Находит таймшит по ID (или выбрасывает NotFoundError)
 * - Вызывает entity.addRow() с переданными данными
 * - Сохраняет таймшит через репозиторий
 * - Возвращает обновлённый TimesheetEntity
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';
import { AddTimesheetRowDto } from '../dto/add-timesheet-row.dto';
import { Timesheet } from '../../../domain/entities/timesheet.entity';

export class AddRowUseCase {
  constructor(private readonly timesheetRepository: ITimesheetRepository) {}

  async execute(
    timesheetId: string,
    dto: AddTimesheetRowDto,
    actorId: string,
  ): Promise<Timesheet> {
    // 1. Находим таймшит по ID
    const timesheet = await this.timesheetRepository.findById(timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet', timesheetId);
    }

    // 2. Вызываем доменный метод добавления строки
    timesheet.addRow({
      issueIdReadable: dto.issueIdReadable,
      source: dto.source,
      minutes: dto.minutes ?? 0,
      comment: dto.comment ?? null,
      managerGrade: dto.managerGrade as any,
      businessGrade: dto.businessGrade as any,
    });

    // 3. Сохраняем через репозиторий
    await this.timesheetRepository.save(timesheet);

    // 4. Возвращаем обновлённый entity
    return timesheet;
  }
}
