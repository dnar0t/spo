/**
 * FinanceController
 *
 * REST API для финансового модуля.
 * Обеспечивает эндпоинты для расчёта зарплаты, налогов и заморозки финансов.
 */
import { Controller, Get, Post, Param, Query, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { FreezeFinancialsUseCase } from '../../application/finance/use-cases/freeze-financials.use-case';
import { FreezeFinancialsResponseDto } from '../../application/finance/dto/freeze-financials.dto';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('api/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly freezeFinancialsUseCase: FreezeFinancialsUseCase) {}

  // ─── Freeze Financials ───

  /**
   * POST /api/finance/periods/:id/freeze
   * Заморозка финансовых данных для периода.
   * Только ADMIN или DIRECTOR.
   */
  @Post('periods/:id/freeze')
  @Roles('Администратор', 'Директор')
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
}
