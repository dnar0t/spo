/**
 * ITimesheetRepository Interface
 *
 * Репозиторий для работы с сущностью Timesheet.
 */
import { Timesheet } from '../entities/timesheet.entity';

export interface ITimesheetRepository {
  /** Найти таймшит по ID */
  findById(id: string): Promise<Timesheet | null>;

  /** Найти таймшит сотрудника за указанный период (год/месяц) */
  findByEmployeeAndPeriod(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<Timesheet | null>;

  /** Найти таймшиты нескольких сотрудников за указанный период */
  findByPeriod(employeeIds: string[], year: number, month: number): Promise<Timesheet[]>;

  /** Сохранить таймшит (создать или обновить) */
  save(timesheet: Timesheet): Promise<void>;

  /** Удалить таймшит по ID */
  delete(id: string): Promise<void>;
}
