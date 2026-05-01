/**
 * FinanceController
 *
 * REST API для финансового модуля.
 * Обеспечивает эндпоинты для расчёта зарплаты, налогов, заморозки финансов
 * и чтения финансовых данных с группировкой.
 */
import { Controller, Get, Post, Param, Query, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import { FreezeFinancialsUseCase } from '../../application/finance/use-cases/freeze-financials.use-case';
import { FreezeFinancialsResponseDto } from '../../application/finance/dto/freeze-financials.dto';
import { GetPeriodGroupsUseCase } from '../../application/finance/use-cases/get-period-groups.use-case';
import { GetPeriodByProjectUseCase } from '../../application/finance/use-cases/get-period-by-project.use-case';
import { GetPeriodBySystemUseCase } from '../../application/finance/use-cases/get-period-by-system.use-case';
import { GetPeriodTotalsUseCase } from '../../application/finance/use-cases/get-period-totals.use-case';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly freezeFinancialsUseCase: FreezeFinancialsUseCase,
    private readonly getPeriodGroupsUseCase: GetPeriodGroupsUseCase,
    private readonly getPeriodByProjectUseCase: GetPeriodByProjectUseCase,
    private readonly getPeriodBySystemUseCase: GetPeriodBySystemUseCase,
    private readonly getPeriodTotalsUseCase: GetPeriodTotalsUseCase,
  ) {}

  // ─── Freeze Financials ───

  /**
   * POST /api/finance/periods/:id/freeze
   * Заморозка финансовых данных для периода.
   * Только ADMIN или DIRECTOR.
   */
  @Post('periods/:id/freeze')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async freezeFinancials(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<FreezeFinancialsResponseDto> {
    return await this.freezeFinancialsUseCase.execute({
      periodId: id,
      frozenById: req.user.id,
      userRoles: req.user.roles ?? [],
    });
  }

  // ─── Finance Read Endpoints ───

  /**
   * GET /api/finance/periods/:id/groups
   * Группировка финансовых данных по историям (иерархия задач).
   */
  @Get('periods/:id/groups')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.FINANCE)
  async getGroups(@Param('id') id: string) {
    return await this.getPeriodGroupsUseCase.execute(id);
  }

  /**
   * GET /api/finance/periods/:id/by-project
   * Группировка финансовых данных по проектам.
   */
  @Get('periods/:id/by-project')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.FINANCE)
  async getByProject(@Param('id') id: string) {
    return await this.getPeriodByProjectUseCase.execute(id);
  }

  /**
   * GET /api/finance/periods/:id/by-system
   * Группировка финансовых данных по системам.
   */
  @Get('periods/:id/by-system')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.FINANCE)
  async getBySystem(@Param('id') id: string) {
    return await this.getPeriodBySystemUseCase.execute({ periodId: id });
  }

  /**
   * GET /api/finance/periods/:id/totals
   * Итоговые финансовые показатели периода.
   */
  @Get('periods/:id/totals')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.FINANCE)
  async getTotals(@Param('id') id: string) {
    return await this.getPeriodTotalsUseCase.execute(id);
  }
}
