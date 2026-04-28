/**
 * GetMyTimesheetUseCase
 *
 * Возвращает таймшит текущего сотрудника за указанный месяц/год.
 * - Ищет таймшит по employeeId, year, month
 * - Если таймшит не найден — возвращает null
 */
import { ITimesheetRepository } from '../../../domain/repositories/timesheet.repository';

export class GetMyTimesheetUseCase {
  constructor(
    private readonly timesheetRepository: ITimesheetRepository,
  ) {}

  async execute(
    employeeId: string,
    year: number,
    month: number,
  ) {
    // Поиск таймшита сотрудника за указанный период
    const timesheet = await this.timesheetRepository.findByEmployeeAndPeriod(
      employeeId,
      year,
      month,
    );

    return timesheet;
  }
}
