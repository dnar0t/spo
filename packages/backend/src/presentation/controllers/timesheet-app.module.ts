/**
 * TimesheetAppModule (Presentation Layer)
 *
 * Модуль для операций с таймшитами (табелями учёта рабочего времени).
 * Регистрирует use cases и контроллер.
 */
import { Module } from '@nestjs/common';
import { TimesheetModule } from '../../infrastructure/prisma/timesheet.module';
import { TimesheetController } from './timesheet.controller';
import { PrismaTimesheetRepository } from '../../infrastructure/prisma/repositories/prisma-timesheet.repository';
import { GetMyTimesheetUseCase } from '../../application/timesheet/use-cases/get-my-timesheet.use-case';
import { GetTeamTimesheetsUseCase } from '../../application/timesheet/use-cases/get-team-timesheets.use-case';
import { UpdateRowUseCase } from '../../application/timesheet/use-cases/update-row.use-case';
import { AddRowUseCase } from '../../application/timesheet/use-cases/add-row.use-case';
import { DeleteRowUseCase } from '../../application/timesheet/use-cases/delete-row.use-case';
import { SubmitTimesheetUseCase } from '../../application/timesheet/use-cases/submit-timesheet.use-case';
import { RecallTimesheetUseCase } from '../../application/timesheet/use-cases/recall-timesheet.use-case';
import { ManagerApproveTimesheetUseCase } from '../../application/timesheet/use-cases/manager-approve-timesheet.use-case';
import { DirectorApproveTimesheetUseCase } from '../../application/timesheet/use-cases/director-approve-timesheet.use-case';
import { RejectTimesheetUseCase } from '../../application/timesheet/use-cases/reject-timesheet.use-case';
import { GetTimesheetHistoryUseCase } from '../../application/timesheet/use-cases/get-timesheet-history.use-case';

@Module({
  imports: [TimesheetModule],
  controllers: [TimesheetController],
  providers: [
    // ─── Use Cases ───
    {
      provide: GetMyTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new GetMyTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: GetTeamTimesheetsUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new GetTeamTimesheetsUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: UpdateRowUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new UpdateRowUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: AddRowUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new AddRowUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: DeleteRowUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new DeleteRowUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: SubmitTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new SubmitTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: RecallTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new RecallTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: ManagerApproveTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new ManagerApproveTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: DirectorApproveTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new DirectorApproveTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: RejectTimesheetUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new RejectTimesheetUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
    {
      provide: GetTimesheetHistoryUseCase,
      useFactory: (repo: PrismaTimesheetRepository) => new GetTimesheetHistoryUseCase(repo),
      inject: [PrismaTimesheetRepository],
    },
  ],
  exports: [
    GetMyTimesheetUseCase,
    GetTeamTimesheetsUseCase,
    UpdateRowUseCase,
    AddRowUseCase,
    DeleteRowUseCase,
    SubmitTimesheetUseCase,
    RecallTimesheetUseCase,
    ManagerApproveTimesheetUseCase,
    DirectorApproveTimesheetUseCase,
    RejectTimesheetUseCase,
    GetTimesheetHistoryUseCase,
  ],
})
export class TimesheetAppModule {}
