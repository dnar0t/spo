/**
 * AdminController
 *
 * Контроллер для административных endpoints.
 * Предоставляет API для управления пользователями, ставками, формулами,
 * справочниками, аудитом, настройками планирования и интеграциями.
 *
 * Все endpoints защищены JwtAuthGuard + RolesGuard.
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
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import { CreateUserUseCase } from '../../application/administration/use-cases/create-user.use-case';
import { UpdateUserUseCase } from '../../application/administration/use-cases/update-user.use-case';
import { DeactivateUserUseCase } from '../../application/administration/use-cases/deactivate-user.use-case';
import { AssignRolesUseCase } from '../../application/administration/use-cases/assign-roles.use-case';
import { AssignManagerUseCase } from '../../application/administration/use-cases/assign-manager.use-case';
import { GetUsersUseCase } from '../../application/administration/use-cases/get-users.use-case';
import { CreateRateUseCase } from '../../application/administration/use-cases/create-rate.use-case';
import { GetRatesUseCase } from '../../application/administration/use-cases/get-rates.use-case';
import { DeleteRateUseCase } from '../../application/administration/use-cases/delete-rate.use-case';
import { UpdateFormulaUseCase } from '../../application/administration/use-cases/update-formula.use-case';
import { GetFormulasUseCase } from '../../application/administration/use-cases/get-formulas.use-case';
import { UpdateEvaluationScaleUseCase } from '../../application/administration/use-cases/update-evaluation-scale.use-case';
import { GetEvaluationScalesUseCase } from '../../application/administration/use-cases/get-evaluation-scales.use-case';
import { UpdatePlanningSettingsUseCase } from '../../application/administration/use-cases/update-planning-settings.use-case';
import { GetPlanningSettingsUseCase } from '../../application/administration/use-cases/get-planning-settings.use-case';
import { GetDictionariesUseCase } from '../../application/administration/use-cases/get-dictionaries.use-case';
import { GetAuditLogUseCase } from '../../application/administration/use-cases/get-audit-log.use-case';
import { GetIntegrationsUseCase } from '../../application/administration/use-cases/get-integrations.use-case';
import { UpdateIntegrationUseCase } from '../../application/administration/use-cases/update-integration.use-case';
import { GetActiveSessionsUseCase } from '../../application/administration/use-cases/get-active-sessions.use-case';
import { GetSensitiveChangesUseCase } from '../../application/administration/use-cases/get-sensitive-changes.use-case';
import { CreateUserDto } from '../../application/administration/dto/create-user.dto';
import { UpdateUserDto } from '../../application/administration/dto/update-user.dto';
import { AssignRolesDto } from '../../application/administration/dto/assign-roles.dto';
import { AssignManagerDto } from '../../application/administration/dto/assign-manager.dto';
import { CreateRateDto } from '../../application/administration/dto/create-rate.dto';
import { UpdateFormulaDto } from '../../application/administration/dto/update-formula.dto';
import { UpdateEvaluationScaleDto } from '../../application/administration/dto/update-evaluation-scale.dto';
import { UpdatePlanningSettingsDto } from '../../application/administration/dto/update-planning-settings.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly assignRolesUseCase: AssignRolesUseCase,
    private readonly assignManagerUseCase: AssignManagerUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly createRateUseCase: CreateRateUseCase,
    private readonly getRatesUseCase: GetRatesUseCase,
    private readonly deleteRateUseCase: DeleteRateUseCase,
    private readonly updateFormulaUseCase: UpdateFormulaUseCase,
    private readonly getFormulasUseCase: GetFormulasUseCase,
    private readonly updateEvaluationScaleUseCase: UpdateEvaluationScaleUseCase,
    private readonly getEvaluationScalesUseCase: GetEvaluationScalesUseCase,
    private readonly updatePlanningSettingsUseCase: UpdatePlanningSettingsUseCase,
    private readonly getDictionariesUseCase: GetDictionariesUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
    private readonly getIntegrationsUseCase: GetIntegrationsUseCase,
    private readonly updateIntegrationUseCase: UpdateIntegrationUseCase,
    private readonly getActiveSessionsUseCase: GetActiveSessionsUseCase,
    private readonly getSensitiveChangesUseCase: GetSensitiveChangesUseCase,
    private readonly getPlanningSettingsUseCase: GetPlanningSettingsUseCase,
  ) {}

  // ====================================================================
  // Users
  // ====================================================================

  /**
   * Список пользователей с пагинацией и фильтрацией.
   *
   * GET /api/admin/users
   */
  @Get('users')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Req() req?: any,
  ) {
    this.logger.log('Getting users list');

    const result = await this.getUsersUseCase.execute({
      page,
      limit,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return result;
  }

  /**
   * Создание нового пользователя.
   *
   * POST /api/admin/users
   */
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async createUser(@Body() dto: CreateUserDto, @Req() req?: any) {
    this.logger.log(`Creating user: ${dto.login}`);

    const userId = req?.user?.id ?? 'system';
    const result = await this.createUserUseCase.execute(dto, {
      userId,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
    return result;
  }

  /**
   * Обновление профиля пользователя.
   *
   * PUT /api/admin/users/:id
   */
  @Put('users/:id')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req?: any) {
    this.logger.log(`Updating user: ${id}`);

    const userId = req?.user?.id ?? 'system';
    const result = await this.updateUserUseCase.execute(
      { ...dto, id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
    return result;
  }

  /**
   * Мягкое удаление (деактивация) пользователя.
   *
   * DELETE /api/admin/users/:id
   */
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async deactivateUser(@Param('id') id: string, @Req() req?: any) {
    this.logger.log(`Deactivating user: ${id}`);

    const userId = req?.user?.id ?? 'system';
    await this.deactivateUserUseCase.execute(
      { id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
  }

  /**
   * Назначение ролей пользователю.
   *
   * PUT /api/admin/users/:id/roles
   */
  @Put('users/:id/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto, @Req() req?: any) {
    this.logger.log(`Assigning roles to user: ${id}`);

    const userId = req?.user?.id ?? 'system';
    await this.assignRolesUseCase.execute(
      { ...dto, userId: id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
  }

  /**
   * Назначение руководителя сотруднику.
   *
   * PUT /api/admin/users/:id/manager
   */
  @Put('users/:id/manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER)
  async assignManager(@Param('id') id: string, @Body() dto: AssignManagerDto, @Req() req?: any) {
    this.logger.log(`Assigning manager to user: ${id}`);

    const userId = req?.user?.id ?? 'system';
    await this.assignManagerUseCase.execute(
      { ...dto, userId: id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
  }

  // ====================================================================
  // Rates (Ставки)
  // ====================================================================

  /**
   * Батч-получение текущих ставок для нескольких сотрудников.
   * Должен быть объявлен до динамических маршрутов (:userId) для корректного роутинга.
   *
   * GET /api/admin/rates/batch?employeeIds=...
   */
  @Get('rates/batch')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.HR)
  async getRatesBatch(@Query('employeeIds') employeeIds: string) {
    this.logger.log(`Getting rates batch for employees: ${employeeIds}`);

    const ids = employeeIds ? employeeIds.split(',') : [];
    const result = await this.getRatesUseCase.getCurrentBatch(ids);

    // Преобразуем Map в массив для удобства клиента
    return Array.from(result.entries()).map(([userId, rate]) => ({
      userId,
      rate,
    }));
  }

  /**
   * Получить текущую ставку сотрудника.
   *
   * GET /api/admin/rates/:userId
   */
  @Get('rates/:userId')
  async getCurrentRate(@Param('userId') userId: string) {
    this.logger.log(`Getting current rate for user: ${userId}`);

    const result = await this.getRatesUseCase.getCurrent(userId);
    return result;
  }

  /**
   * Создать/обновить ставку сотрудника.
   *
   * POST /api/admin/rates/:userId
   */
  @Post('rates/:userId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.HR)
  async createRate(@Param('userId') userId: string, @Body() dto: CreateRateDto, @Req() req?: any) {
    this.logger.log(`Creating rate for user: ${userId}`);

    const changedById = req?.user?.id ?? 'system';
    const result = await this.createRateUseCase.execute(
      { ...dto, userId, changedById },
      {
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
    return result;
  }

  /**
   * Получить историю ставок сотрудника.
   *
   * GET /api/admin/rates/:userId/history
   */
  @Get('rates/:userId/history')
  async getRateHistory(@Param('userId') userId: string) {
    this.logger.log(`Getting rate history for user: ${userId}`);

    const result = await this.getRatesUseCase.getHistory(userId);
    return result;
  }

  /**
   * Мягкое удаление ставки (проставляет effectiveTo = now()).
   *
   * DELETE /api/admin/rates/:id
   */
  @Delete('rates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.HR)
  async deleteRate(@Param('id') id: string, @Req() req?: any) {
    this.logger.log(`Deleting rate: ${id}`);

    const userId = req?.user?.id ?? 'system';
    await this.deleteRateUseCase.execute(id, userId);
  }

  // ====================================================================
  // Formulas (Формулы)
  // ====================================================================

  /**
   * Получить список формул.
   *
   * GET /api/admin/formulas
   */
  @Get('formulas')
  async getFormulas() {
    this.logger.log('Getting formulas list');

    const result = await this.getFormulasUseCase.execute();
    return result;
  }

  /**
   * Обновить формулу.
   *
   * PUT /api/admin/formulas/:id
   */
  @Put('formulas/:id')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.FINANCE)
  async updateFormula(@Param('id') id: string, @Body() dto: UpdateFormulaDto, @Req() req?: any) {
    this.logger.log(`Updating formula: ${id}`);

    const userId = req?.user?.id ?? 'system';
    const result = await this.updateFormulaUseCase.execute(
      { ...dto, formulaId: id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
    return result;
  }

  // ====================================================================
  // Dictionaries (Справочники)
  // ====================================================================

  /**
   * Получить все справочники (workRoles, evaluationScales, projects, systems, workTypes).
   *
   * GET /api/admin/dictionaries
   */
  @Get('dictionaries')
  async getDictionaries() {
    this.logger.log('Getting dictionaries');

    const result = await this.getDictionariesUseCase.execute();
    return result;
  }

  // ====================================================================
  // Evaluation Scales (Шкалы оценок)
  // ====================================================================

  /**
   * Получить справочник шкал оценок.
   *
   * GET /api/admin/evaluation-scales
   */
  @Get('evaluation-scales')
  async getEvaluationScales() {
    this.logger.log('Getting evaluation scales');

    const result = await this.getEvaluationScalesUseCase.execute();
    return result;
  }

  /**
   * Обновить шкалу оценок.
   *
   * PUT /api/admin/evaluation-scales/:id
   */
  @Put('evaluation-scales/:id')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async updateEvaluationScale(
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationScaleDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Updating evaluation scale: ${id}`);

    const userId = req?.user?.id ?? 'system';
    await this.updateEvaluationScaleUseCase.execute(
      { ...dto, scaleId: id },
      {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
  }

  // ====================================================================
  // Audit Log (Журнал аудита)
  // ====================================================================

  /**
   * Получить журнал аудита с пагинацией.
   *
   * GET /api/admin/audit-log
   */
  @Get('audit-log')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getAuditLog(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    this.logger.log('Getting audit log');

    const result = await this.getAuditLogUseCase.execute({
      page,
      limit,
      userId,
      action,
      entityType,
      entityId,
      dateFrom,
      dateTo,
    });
    return result;
  }

  // ====================================================================
  // Settings (Настройки)
  // ====================================================================

  /**
   * Получить текущие настройки планирования.
   *
   * GET /api/admin/settings/planning
   */
  @Get('settings/planning')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getPlanningSettings() {
    this.logger.log('Getting planning settings');
    return await this.getPlanningSettingsUseCase.execute();
  }

  /**
   * Обновить настройки планирования.
   *
   * PUT /api/admin/settings/planning
   */
  @Put('settings/planning')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async updatePlanningSettings(@Body() dto: UpdatePlanningSettingsDto, @Req() req?: any) {
    this.logger.log('Updating planning settings');

    const updatedBy = req?.user?.id ?? 'system';
    await this.updatePlanningSettingsUseCase.execute(
      { ...dto, updatedBy },
      {
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    );
  }

  // ====================================================================
  // Integrations (Интеграции)
  // ====================================================================

  /**
   * Получить список всех настроек интеграций.
   *
   * GET /api/admin/integrations
   */
  @Get('integrations')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getIntegrations() {
    this.logger.log('Getting integrations');

    return await this.getIntegrationsUseCase.execute();
  }

  /**
   * Обновить настройки конкретной интеграции.
   *
   * PUT /api/admin/integrations/:id
   */
  @Put('integrations/:id')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async updateIntegration(@Param('id') id: string, @Body() dto: any, @Req() req?: any) {
    this.logger.log(`Updating integration: ${id}`);

    const userId = req?.user?.id ?? 'system';
    return await this.updateIntegrationUseCase.execute(id, dto, {
      userId,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  /**
   * Получить все активные сессии пользователей.
   *
   * GET /api/admin/sessions
   */
  @Get('sessions')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getActiveSessions() {
    this.logger.log('Getting active sessions');

    return await this.getActiveSessionsUseCase.execute();
  }

  /**
   * Получить журнал чувствительных изменений.
   *
   * GET /api/admin/sensitive-changes
   */
  @Get('sensitive-changes')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getSensitiveChanges(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    this.logger.log('Getting sensitive changes');

    return await this.getSensitiveChangesUseCase.execute({ page, limit, dateFrom, dateTo });
  }
}
