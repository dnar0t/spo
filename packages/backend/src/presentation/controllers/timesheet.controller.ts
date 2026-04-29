import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
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
import {
  TimesheetResponseDto,
  TimesheetStatusTransitionResponseDto,
} from '../../application/timesheet/dto/timesheet-response.dto';
import { UpdateTimesheetRowDto } from '../../application/timesheet/dto/update-timesheet-row.dto';
import { AddTimesheetRowDto } from '../../application/timesheet/dto/add-timesheet-row.dto';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('api/timesheets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetController {
  private readonly logger = new Logger(TimesheetController.name);

  constructor(
    private readonly getMyTimesheetUseCase: GetMyTimesheetUseCase,
    private readonly getTeamTimesheetsUseCase: GetTeamTimesheetsUseCase,
    private readonly updateRowUseCase: UpdateRowUseCase,
    private readonly addRowUseCase: AddRowUseCase,
    private readonly deleteRowUseCase: DeleteRowUseCase,
    private readonly submitTimesheetUseCase: SubmitTimesheetUseCase,
    private readonly recallTimesheetUseCase: RecallTimesheetUseCase,
    private readonly managerApproveTimesheetUseCase: ManagerApproveTimesheetUseCase,
    private readonly directorApproveTimesheetUseCase: DirectorApproveTimesheetUseCase,
    private readonly rejectTimesheetUseCase: RejectTimesheetUseCase,
    private readonly getTimesheetHistoryUseCase: GetTimesheetHistoryUseCase,
  ) {}

  // ─── My Timesheet ───

  /**
   * GET /api/timesheets/mine?year=&month=
   * Возвращает таймшит текущего сотрудника за указанный месяц/год.
   */
  @Get('mine')
  async getMine(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto | null> {
    this.logger.log(`Getting timesheet for user ${req.user.id}, year=${year}, month=${month}`);

    const result = await this.getMyTimesheetUseCase.execute(
      req.user.id,
      parseInt(year, 10),
      parseInt(month, 10),
    );

    return result ? TimesheetResponseDto.fromDomain(result) : null;
  }

  // ─── Team Timesheets ───

  /**
   * GET /api/timesheets/team?year=&month=&employeeIds=
   * Возвращает табели нескольких сотрудников за указанный период.
   * Только admin, director, manager.
   */
  @Get('team')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER)
  async getTeam(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('employeeIds') employeeIds: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto[]> {
    this.logger.log(
      `Getting team timesheets, year=${year}, month=${month}, employeeIds=${employeeIds}`,
    );

    const ids = employeeIds ? employeeIds.split(',') : [];
    const result = await this.getTeamTimesheetsUseCase.execute(
      ids,
      parseInt(year, 10),
      parseInt(month, 10),
    );

    return result.map(TimesheetResponseDto.fromDomain);
  }

  // ─── Update Row ───

  /**
   * PUT /api/timesheets/:id/rows/:rowId
   * Обновляет существующую строку таймшита.
   */
  @Put(':id/rows/:rowId')
  async updateRow(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdateTimesheetRowDto,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Updating row ${rowId} in timesheet ${id} by user ${req.user.id}`);

    const result = await this.updateRowUseCase.execute(id, rowId, dto, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Add Row ───

  /**
   * POST /api/timesheets/:id/rows
   * Добавляет новую строку в таймшит.
   */
  @Post(':id/rows')
  @HttpCode(HttpStatus.CREATED)
  async addRow(
    @Param('id') id: string,
    @Body() dto: AddTimesheetRowDto,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Adding row to timesheet ${id} by user ${req.user.id}`);

    const result = await this.addRowUseCase.execute(id, dto, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Delete Row ───

  /**
   * DELETE /api/timesheets/:id/rows/:rowId
   * Удаляет строку из таймшита.
   */
  @Delete(':id/rows/:rowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRow(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    this.logger.log(`Deleting row ${rowId} from timesheet ${id} by user ${req.user.id}`);

    await this.deleteRowUseCase.execute(id, rowId, req.user.id);
  }

  // ─── Submit ───

  /**
   * POST /api/timesheets/:id/submit
   * Отправляет таймшит на согласование (draft → submitted).
   */
  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Submitting timesheet ${id} by user ${req.user.id}`);

    const result = await this.submitTimesheetUseCase.execute(id, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Recall ───

  /**
   * POST /api/timesheets/:id/recall
   * Отзывает таймшит из согласования (submitted → draft).
   */
  @Post(':id/recall')
  async recall(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Recalling timesheet ${id} by user ${req.user.id}`);

    const result = await this.recallTimesheetUseCase.execute(id, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Manager Approve ───

  /**
   * POST /api/timesheets/:id/manager-approve
   * Согласование таймшита руководителем (submitted → manager_approved).
   * Только admin, director, manager.
   */
  @Post(':id/manager-approve')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER)
  async managerApprove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Manager approving timesheet ${id} by user ${req.user.id}`);

    const result = await this.managerApproveTimesheetUseCase.execute(id, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Director Approve ───

  /**
   * POST /api/timesheets/:id/director-approve
   * Утверждает таймшит директором (manager_approved → approved).
   * Только admin, director.
   */
  @Post(':id/director-approve')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async directorApprove(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Director approving timesheet ${id} by user ${req.user.id}`);

    const result = await this.directorApproveTimesheetUseCase.execute(id, req.user.id);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── Reject ───

  /**
   * POST /api/timesheets/:id/reject
   * Отклоняет таймшит из любого активного статуса в rejected.
   * Только admin, director, manager.
   */
  @Post(':id/reject')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER)
  async reject(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req: RequestWithUser,
  ): Promise<TimesheetResponseDto> {
    this.logger.log(`Rejecting timesheet ${id} by user ${req.user.id}`);

    const result = await this.rejectTimesheetUseCase.execute(id, req.user.id, comment);
    return TimesheetResponseDto.fromDomain(result);
  }

  // ─── History ───

  /**
   * GET /api/timesheets/:id/history
   * Возвращает историю статусных переходов таймшита.
   */
  @Get(':id/history')
  async getHistory(@Param('id') id: string): Promise<TimesheetStatusTransitionResponseDto[]> {
    this.logger.log(`Getting history for timesheet ${id}`);

    const result = await this.getTimesheetHistoryUseCase.execute(id);
    return result.map(TimesheetStatusTransitionResponseDto.fromDomain);
  }
}
