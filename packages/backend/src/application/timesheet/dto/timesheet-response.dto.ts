/**
 * TimesheetResponseDto
 *
 * DTO для ответа API с данными табеля (timesheet).
 * Содержит полную информацию о табеле: строки, историю статусов, изменения строк.
 */
import { Timesheet, TimesheetStatus } from '../../../domain/entities/timesheet.entity';
import { TimesheetRow, TimesheetRowGrade, TimesheetRowBusinessGrade, TimesheetRowSource } from '../../../domain/entities/timesheet-row.entity';
import { TimesheetStatusTransition } from '../../../domain/entities/timesheet-status-transition.entity';
import { TimesheetRowChange } from '../../../domain/entities/timesheet-row-change.entity';

export class TimesheetRowResponseDto {
  readonly id: string;
  readonly issueIdReadable: string;
  readonly source: TimesheetRowSource;
  readonly minutes: number;
  readonly comment: string | null;
  readonly managerGrade: TimesheetRowGrade;
  readonly businessGrade: TimesheetRowBusinessGrade;

  private constructor(data: TimesheetRowResponseDto) {
    Object.assign(this, data);
  }

  static fromDomain(row: TimesheetRow): TimesheetRowResponseDto {
    return new TimesheetRowResponseDto({
      id: row.id,
      issueIdReadable: row.issueIdReadable,
      source: row.source,
      minutes: row.minutes,
      comment: row.comment,
      managerGrade: row.managerGrade,
      businessGrade: row.businessGrade,
    });
  }
}

export class TimesheetStatusTransitionResponseDto {
  readonly id: string;
  readonly actorId: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly comment: string | null;
  readonly createdAt: string;

  private constructor(data: TimesheetStatusTransitionResponseDto) {
    Object.assign(this, data);
  }

  static fromDomain(transition: TimesheetStatusTransition): TimesheetStatusTransitionResponseDto {
    return new TimesheetStatusTransitionResponseDto({
      id: transition.id,
      actorId: transition.actorId,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      comment: transition.comment,
      createdAt: transition.createdAt.toISOString(),
    });
  }
}

export class TimesheetRowChangeResponseDto {
  readonly id: string;
  readonly rowId: string;
  readonly actorId: string;
  readonly field: 'minutes' | 'managerGrade' | 'businessGrade';
  readonly fromValue: string;
  readonly toValue: string;
  readonly createdAt: string;

  private constructor(data: TimesheetRowChangeResponseDto) {
    Object.assign(this, data);
  }

  static fromDomain(change: TimesheetRowChange): TimesheetRowChangeResponseDto {
    return new TimesheetRowChangeResponseDto({
      id: change.id,
      rowId: change.rowId,
      actorId: change.actorId,
      field: change.field,
      fromValue: change.fromValue,
      toValue: change.toValue,
      createdAt: change.createdAt.toISOString(),
    });
  }
}

export class TimesheetResponseDto {
  readonly id: string;
  readonly employeeId: string;
  readonly year: number;
  readonly month: number;
  readonly status: TimesheetStatus;
  readonly rows: TimesheetRowResponseDto[];
  readonly history: TimesheetStatusTransitionResponseDto[];
  readonly rowChanges: TimesheetRowChangeResponseDto[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(data: TimesheetResponseDto) {
    Object.assign(this, data);
  }

  static fromDomain(timesheet: Timesheet): TimesheetResponseDto {
    return new TimesheetResponseDto({
      id: timesheet.id,
      employeeId: timesheet.employeeId,
      year: timesheet.year,
      month: timesheet.month,
      status: timesheet.status,
      rows: timesheet.rows.map((row) => TimesheetRowResponseDto.fromDomain(row)),
      history: timesheet.history.map((h) => TimesheetStatusTransitionResponseDto.fromDomain(h)),
      rowChanges: timesheet.rowChanges.map((rc) => TimesheetRowChangeResponseDto.fromDomain(rc)),
      createdAt: timesheet.createdAt.toISOString(),
      updatedAt: timesheet.updatedAt.toISOString(),
    });
  }
}
