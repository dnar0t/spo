/**
 * AdminController
 *
 * Контроллер для административных endpoints.
 * Предоставляет API для управления пользователями, ставками, формулами,
 * справочниками, аудитом и настройками планирования.
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
import { CreateUserUseCase } from '../../application/administration/use-cases/create-user.use-case';
import { UpdateUserUseCase } from '../../application/administration/use-cases/update-user.use-case';
import { DeactivateUserUseCase } from '../../application/administration/use-cases/deactivate-user.use-case';
import { AssignRolesUseCase } from '../../application/administration/use-cases/assign-roles.use-case';
import { AssignManagerUseCase } from '../../application/administration/use-cases/assign-manager.use-case';
import { GetUsersUseCase } from '../../application/administration/use-cases/get-users.use-case';
import { CreateRateUseCase } from '../../application/administration/use-cases/create-rate.use-case';
import { GetRatesUseCase } from '../../application/administration/use-cases/get-rates.use-case';
import { UpdateFormulaUseCase } from '../../application/administration/use-cases/update-formula.use-case';
import { GetFormulasUseCase } from '../../application/administration/use-cases/get-formulas.use-case';
import { UpdateEvaluationScaleUseCase } from '../../application/administration/use-cases/update-evaluation-scale.use-case';
import { GetEvaluationScalesUseCase } from '../../application/administration/use-cases/get-evaluation-scales.use-case';
import { UpdatePlanningSettingsUseCase } from '../../application/administration/use-cases/update-planning-settings.use-case';
import { GetDictionariesUseCase } from '../../application/administration/use-cases/get-dictionaries.use-case';
import { GetAuditLogUseCase } from '../../application/administration/use-cases/get-audit-log.use-case';
import { CreateUserDto } from '../../application/administration/dto/create-user.dto';
import { UpdateUserDto } from '../../application/administration/dto/update-user.dto';
import { AssignRolesDto } from '../../application/administration/dto/assign-roles.dto';
import { AssignManagerDto } from '../../application/administration/dto/assign-manager.dto';
import { CreateRateDto } from '../../application/administration/dto/create-rate.dto';
import { UpdateFormulaDto } from '../../application/administration/dto/update-formula.dto';
import { UpdateEvaluationScaleDto } from '../../application/administration/dto/update-evaluation-scale.dto';
import { UpdatePlanningSettingsDto } from '../../application/administration/dto/update-planning-settings.dto';

@Controller('api/admin')
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
    private readonly updateFormulaUseCase: UpdateFormulaUseCase,
    private readonly getFormulasUseCase: GetFormulasUseCase,
    private readonly updateEvaluationScaleUseCase: UpdateEvaluationScaleUseCase,
    private readonly getEvaluationScalesUseCase: GetEvaluationScalesUseCase,
    private readonly updatePlanningSettingsUseCase: UpdatePlanningSettingsUseCase,
    private readonly getDictionariesUseCase: GetDictionariesUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
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
  @Roles('ADMIN', 'DIRECTOR')
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Req() req?: any,
  ) {
    this.logger.log('Getting users list');

    try {
      const result = await this.getUsersUseCase.execute({
        page,
        limit,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Создание нового пользователя.
   *
   * POST /api/admin/users
   */
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'DIRECTOR')
  async createUser(@Body() dto: CreateUserDto, @Req() req?: any) {
    this.logger.log(`Creating user: ${dto.login}`);

    try {
      const userId = req?.user?.id ?? 'system';
      const result = await this.createUserUseCase.execute(dto, {
        userId,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Обновление профиля пользователя.
   *
   * PUT /api/admin/users/:id
   */
  @Put('users/:id')
  @Roles('ADMIN', 'DIRECTOR')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Updating user: ${id}`);

    try {
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
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Мягкое удаление (деактивация) пользователя.
   *
   * DELETE /api/admin/users/:id
   */
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'DIRECTOR')
  async deactivateUser(@Param('id') id: string, @Req() req?: any) {
    this.logger.log(`Deactivating user: ${id}`);

    try {
      const userId = req?.user?.id ?? 'system';
      await this.deactivateUserUseCase.execute(
        { id },
        {
          userId,
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Назначение ролей пользователю.
   *
   * PUT /api/admin/users/:id/roles
   */
  @Put('users/:id/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'DIRECTOR')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Assigning roles to user: ${id}`);

    try {
      const userId = req?.user?.id ?? 'system';
      await this.assignRolesUseCase.execute(
        { ...dto, userId: id },
        {
          userId,
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Назначение руководителя сотруднику.
   *
   * PUT /api/admin/users/:id/manager
   */
  @Put('users/:id/manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'DIRECTOR', 'MANAGER')
  async assignManager(
    @Param('id') id: string,
    @Body() dto: AssignManagerDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Assigning manager to user: ${id}`);

    try {
      const userId = req?.user?.id ?? 'system';
      await this.assignManagerUseCase.execute(
        { ...dto, userId: id },
        {
          userId,
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Rates (Ставки)
  // ====================================================================

  /**
   * Получить текущую ставку сотрудника.
   *
   * GET /api/admin/rates/:userId
   */
  @Get('rates/:userId')
  async getCurrentRate(@Param('userId') userId: string) {
    this.logger.log(`Getting current rate for user: ${userId}`);

    try {
      const result = await this.getRatesUseCase.getCurrent(userId);
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Создать/обновить ставку сотрудника.
   *
   * POST /api/admin/rates/:userId
   */
  @Post('rates/:userId')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'DIRECTOR', 'HR')
  async createRate(
    @Param('userId') userId: string,
    @Body() dto: CreateRateDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Creating rate for user: ${userId}`);

    try {
      const changedById = req?.user?.id ?? 'system';
      const result = await this.createRateUseCase.execute(
        { ...dto, userId, changedById },
        {
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Получить историю ставок сотрудника.
   *
   * GET /api/admin/rates/:userId/history
   */
  @Get('rates/:userId/history')
  async getRateHistory(@Param('userId') userId: string) {
    this.logger.log(`Getting rate history for user: ${userId}`);

    try {
      const result = await this.getRatesUseCase.getHistory(userId);
      return result;
    } catch (error) {
      this.handleError(error);
    }
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

    try {
      const result = await this.getFormulasUseCase.execute();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Обновить формулу.
   *
   * PUT /api/admin/formulas/:id
   */
  @Put('formulas/:id')
  @Roles('ADMIN', 'DIRECTOR', 'FINANCE')
  async updateFormula(
    @Param('id') id: string,
    @Body() dto: UpdateFormulaDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Updating formula: ${id}`);

    try {
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
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Dictionaries (Справочники)
  // ====================================================================

  /**
   * Получить все справочники (workRoles, evaluationScales).
   *
   * GET /api/admin/dictionaries
   */
  @Get('dictionaries')
  async getDictionaries() {
    this.logger.log('Getting dictionaries');

    try {
      const result = await this.getDictionariesUseCase.execute();
      return result;
    } catch (error) {
      this.handleError(error);
    }
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

    try {
      const result = await this.getEvaluationScalesUseCase.execute();
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Обновить шкалу оценок.
   *
   * PUT /api/admin/evaluation-scales/:id
   */
  @Put('evaluation-scales/:id')
  @Roles('ADMIN', 'DIRECTOR')
  async updateEvaluationScale(
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationScaleDto,
    @Req() req?: any,
  ) {
    this.logger.log(`Updating evaluation scale: ${id}`);

    try {
      const userId = req?.user?.id ?? 'system';
      await this.updateEvaluationScaleUseCase.execute(
        { ...dto, scaleId: id },
        {
          userId,
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
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
  @Roles('ADMIN', 'DIRECTOR')
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

    try {
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
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Settings (Настройки)
  // ====================================================================

  /**
   * Обновить настройки планирования.
   *
   * PUT /api/admin/settings/planning
   */
  @Put('settings/planning')
  @Roles('ADMIN', 'DIRECTOR')
  async updatePlanningSettings(
    @Body() dto: UpdatePlanningSettingsDto,
    @Req() req?: any,
  ) {
    this.logger.log('Updating planning settings');

    try {
      const updatedBy = req?.user?.id ?? 'system';
      await this.updatePlanningSettingsUseCase.execute(
        { ...dto, updatedBy },
        {
          ipAddress: req?.ip,
          userAgent: req?.headers?.['user-agent'],
        },
      );
      return { success: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Error Handling
  // ====================================================================

  /**
   * Обработка доменных ошибок.
   */
  private handleError(error: unknown): never {
    if (error instanceof Error) {
      this.logger.error(`Admin operation failed: ${error.message}`, error.stack);
      throw error;
    }
    throw error;
  }
}
