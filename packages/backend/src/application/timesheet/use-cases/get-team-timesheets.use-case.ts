/**
 * GetTeamTimesheetsUseCase
 *
 * Возвращает табели нескольких сотрудников за указанный период (год/месяц).
 * Используется руководителем для просмотра табелей команды.
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';
import { Timesheet } from '../../../domain/entities/timesheet.entity';

export class GetTeamTimesheetsUseCase {
  constructor(
    private readonly timesheetRepository: ITimesheetRepository,
  ) {}

  async execute(
    employeeIds: string[],
    year: number,
    month: number,
  ): Promise<Timesheet[]> {
    return this.timesheetRepository.findByPeriod(employeeIds, year, month);
  }
}
