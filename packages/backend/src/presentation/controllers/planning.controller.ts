/**
 * PlanningController
 *
 * REST API контроллер для модуля Sprint Planning.
 * Предоставляет CRUD операции для отчётных периодов,
 * управление бэклогом, мощностью сотрудников и
 * жизненным циклом периодов (стейт-машина).
 *
 * Префикс: planning
 *
 * Защищён JwtAuthGuard + RolesGuard.
 */
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
  Logger,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { CreatePeriodUseCase } from '../../application/planning/use-cases/create-period.use-case';
import { UpdatePeriodUseCase } from '../../application/planning/use-cases/update-period.use-case';
import { GetPeriodsUseCase } from '../../application/planning/use-cases/get-periods.use-case';
import { GetPeriodDetailUseCase } from '../../application/planning/use-cases/get-period-detail.use-case';
import { GetBacklogUseCase } from '../../application/planning/use-cases/get-backlog.use-case';
import { GetCapacityUseCase } from '../../application/planning/use-cases/get-capacity.use-case';
import { AssignTaskUseCase } from '../../application/planning/use-cases/assign-task.use-case';
import { UnassignTaskUseCase } from '../../application/planning/use-cases/unassign-task.use-case';
import { FixPlanUseCase } from '../../application/planning/use-cases/fix-plan.use-case';
import { TransitionPeriodUseCase } from '../../application/planning/use-cases/transition-period.use-case';
import { DeletePeriodUseCase } from '../../application/planning/use-cases/delete-period.use-case';
import { UpdateTaskSortUseCase } from '../../application/planning/use-cases/update-task-sort.use-case';
import { UpdateTaskReadinessUseCase } from '../../application/planning/use-cases/update-task-readiness.use-case';
import { GetPlanVersionsUseCase } from '../../application/planning/use-cases/get-plan-versions.use-case';
import { CreatePeriodDto } from '../../application/planning/dto/create-period.dto';
import { UpdatePeriodDto } from '../../application/planning/dto/update-period.dto';
import { AssignTaskDto } from '../../application/planning/dto/assign-task.dto';
import { FixPlanDto } from '../../application/planning/dto/fix-plan.dto';
import { InvalidArgumentError } from '../../domain/errors/domain.error';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningController {
  private readonly logger = new Logger(PlanningController.name);

  constructor(
    private readonly createPeriodUseCase: CreatePeriodUseCase,
    private readonly updatePeriodUseCase: UpdatePeriodUseCase,
    private readonly getPeriodsUseCase: GetPeriodsUseCase,
    private readonly getPeriodDetailUseCase: GetPeriodDetailUseCase,
    private readonly getBacklogUseCase: GetBacklogUseCase,
    private readonly getCapacityUseCase: GetCapacityUseCase,
    private readonly assignTaskUseCase: AssignTaskUseCase,
    private readonly unassignTaskUseCase: UnassignTaskUseCase,
    private readonly fixPlanUseCase: FixPlanUseCase,
    private readonly transitionPeriodUseCase: TransitionPeriodUseCase,
    private readonly deletePeriodUseCase: DeletePeriodUseCase,
    private readonly updateTaskSortUseCase: UpdateTaskSortUseCase,
    private readonly updateTaskReadinessUseCase: UpdateTaskReadinessUseCase,
    private readonly getPlanVersionsUseCase: GetPlanVersionsUseCase,
  ) {}

  // ====================================================================
  // Periods
  // ====================================================================

  /**
   * Создание нового отчётного периода.
   *
   * POST /api/planning/periods
   */
  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'director')
  async createPeriod(@Body() dto: CreatePeriodDto) {
    this.logger.log(`Creating period: ${dto.month}/${dto.year}`);

    // В реальном приложении userId будет извлекаться из JWT токена.
    const userId = 'system';
    const result = await this.createPeriodUseCase.execute(dto, userId);
    return result;
  }

  /**
   * Список отчётных периодов с пагинацией.
   *
   * GET /api/planning/periods
   */
  @Get('periods')
  async getPeriods(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    this.logger.log(`Fetching periods: page=${page}, limit=${limit}`);

    const result = await this.getPeriodsUseCase.execute({
      page: Math.max(1, Number(page)),
      limit: Math.min(Math.max(1, Number(limit)), 100),
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    });
    return result;
  }

  /**
   * Детальная информация об отчётном периоде.
   *
   * GET /api/planning/periods/:id
   */
  @Get('periods/:id')
  async getPeriodDetail(@Param('id') id: string) {
    this.logger.log(`Fetching period detail: id=${id}`);

    const result = await this.getPeriodDetailUseCase.execute(id);
    return result;
  }

  /**
   * Обновление настроек отчётного периода.
   *
   * PUT /api/planning/periods/:id
   */
  @Put('periods/:id')
  @Roles('admin', 'director')
  async updatePeriod(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    this.logger.log(`Updating period: id=${id}`);

    const result = await this.updatePeriodUseCase.execute(id, dto);
    return result;
  }

  /**
   * Удаление отчётного периода (только в состоянии PLANNING).
   *
   * DELETE /api/planning/periods/:id
   */
  @Delete('periods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'director')
  async deletePeriod(@Param('id') id: string) {
    this.logger.log(`Deleting period: id=${id}`);

    await this.deletePeriodUseCase.execute(id);
  }

  // ====================================================================
  // Backlog
  // ====================================================================

  /**
   * Получение бэклога задач для указанного периода.
   *
   * GET /api/planning/periods/:id/backlog
   */
  @Get('periods/:id/backlog')
  async getBacklog(
    @Param('id') id: string,
    @Query('system') system?: string,
    @Query('project') project?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('reporter') reporter?: string,
    @Query('isPlanned') isPlanned?: string,
    @Query('readinessMin') readinessMin?: number,
    @Query('readinessMax') readinessMax?: number,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    this.logger.log(`Fetching backlog for period: id=${id}`);

    // Формируем фильтры, передавая только заполненные параметры
    const filters: Record<string, unknown> = {};

    if (system) filters.systemName = system;
    if (project) filters.projectIds = [project];
    if (priority) filters.priorities = [priority];
    if (type) filters.typeName = type;
    if (status) filters.statusName = status;
    if (assignee) filters.assigneeId = assignee;
    if (reporter) filters.reporterId = reporter;
    if (isPlanned !== undefined) {
      if (isPlanned === 'true') filters.onlyPlanned = true;
      if (isPlanned === 'false') filters.onlyUnplanned = true;
    }
    if (readinessMin !== undefined) filters.readinessMin = Number(readinessMin);
    if (readinessMax !== undefined) filters.readinessMax = Number(readinessMax);
    if (search) filters.search = search;

    const result = await this.getBacklogUseCase.execute(id, filters as any, {
      page: Math.max(1, Number(page)),
      limit: Math.min(Math.max(1, Number(limit)), 100),
    });
    return result;
  }

  // ====================================================================
  // Capacity
  // ====================================================================

  /**
   * Получение мощности сотрудников для указанного периода.
   *
   * GET /api/planning/periods/:id/capacity
   */
  @Get('periods/:id/capacity')
  async getCapacity(@Param('id') id: string) {
    this.logger.log(`Fetching capacity for period: id=${id}`);

    const result = await this.getCapacityUseCase.execute(id);
    return result;
  }

  // ====================================================================
  // Task Management
  // ====================================================================

  /**
   * Назначение задачи на сотрудника в рамках периода.
   *
   * PUT /api/planning/periods/:id/tasks/:taskId
   */
  @Put('periods/:id/tasks/:taskId')
  @Roles('admin', 'director', 'manager')
  async assignTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: AssignTaskDto,
  ) {
    this.logger.log(`Assigning task ${taskId} in period ${id}`);

    const result = await this.assignTaskUseCase.execute({
      periodId: id,
      issueNumber: taskId,
      summary: '', // Будет заполнено при загрузке из YouTrack
      dto,
    });
    return result;
  }

  /**
   * Снятие назначения с задачи в рамках периода.
   *
   * DELETE /api/planning/periods/:id/tasks/:taskId
   */
  @Delete('periods/:id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'director', 'manager')
  async unassignTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    this.logger.log(`Unassigning task ${taskId} in period ${id}`);

    await this.unassignTaskUseCase.execute(taskId);
  }

  /**
   * Изменение порядка сортировки задачи в бэклоге.
   *
   * PUT /api/planning/periods/:id/tasks/:taskId/sort
   */
  @Put('periods/:id/tasks/:taskId/sort')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'director', 'manager')
  async updateTaskSortOrder(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body('sortOrder') sortOrder: number,
  ) {
    this.logger.log(`Updating sort order for task ${taskId} in period ${id}`);

    const result = await this.updateTaskSortUseCase.execute(taskId, sortOrder);
    return result;
  }

  /**
   * Обновление процента готовности задачи.
   *
   * PUT /api/planning/periods/:id/tasks/:taskId/readiness
   */
  @Put('periods/:id/tasks/:taskId/readiness')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'director', 'manager')
  async updateTaskReadiness(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body('readinessPercent') readinessPercent: number,
  ) {
    this.logger.log(`Updating readiness for task ${taskId} in period ${id}: ${readinessPercent}%`);

    const result = await this.updateTaskReadinessUseCase.execute(taskId, readinessPercent);
    return result;
  }

  // ====================================================================
  // Fix Plan
  // ====================================================================

  /**
   * Фиксация плана спринта для указанного периода.
   *
   * POST /api/planning/periods/:id/fix-plan
   */
  @Post('periods/:id/fix-plan')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'director')
  async fixPlan(@Param('id') id: string, @Body() dto?: FixPlanDto) {
    this.logger.log(`Fixing plan for period: id=${id}`);

    const userId = 'system';
    const result = await this.fixPlanUseCase.execute(id, userId, dto);
    return result;
  }

  /**
   * Список версий плана для указанного периода.
   *
   * GET /api/planning/periods/:id/plan-versions
   */
  @Get('periods/:id/plan-versions')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'director', 'manager')
  async getPlanVersions(@Param('id') id: string) {
    this.logger.log(`Fetching plan versions for period: id=${id}`);

    const result = await this.getPlanVersionsUseCase.execute(id);
    return result;
  }

  // ====================================================================
  // Workflow (State Machine Transitions)
  // ====================================================================

  /**
   * Выполнение перехода состояния периода.
   *
   * POST /api/planning/periods/:id/transition
   */
  @Post('periods/:id/transition')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'director')
  async transitionPeriod(
    @Param('id') id: string,
    @Body('transition') transition: string,
    @Body('reason') reason?: string,
  ) {
    this.logger.log(`Transitioning period ${id}: ${transition}`);

    // Маппинг названий переходов на целевые состояния стейт-машины
    const transitionToState: Record<string, string> = {
      FIX_PLAN: 'PLAN_FIXED',
      LOAD_FACT: 'FACT_LOADING',
      SUBMIT_EVALUATIONS: 'EVALUATION',
      CLOSE_PERIOD: 'CLOSED',
    };

    const targetState = transitionToState[transition];
    if (!targetState) {
      throw new InvalidArgumentError(
        'transition',
        `Invalid transition "${transition}". Allowed transitions: ${Object.keys(transitionToState).join(', ')}`,
      );
    }

    const userId = 'system';

    const result = await this.transitionPeriodUseCase.execute({
      periodId: id,
      targetState,
      userId,
      reason: reason ?? null,
    });
    return result;
  }
}
