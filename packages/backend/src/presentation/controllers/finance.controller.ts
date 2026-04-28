/**
 * FinanceController
 *
 * REST API для финансового модуля.
 * Обеспечивает эндпоинты для расчёта зарплаты, налогов и заморозки финансов.
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { FreezeFinancialsUseCase } from '../../application/finance/use-cases/freeze-financials.use-case';
import { FreezeFinancialsRequestDto, FreezeFinancialsResponseDto } from '../../application/finance/dto/freeze-financials.dto';
import {
  NotFoundError,
  DomainStateError,
  UnauthorizedError,
} from '../../domain/errors/domain.error';

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

  constructor(
    private readonly freezeFinancialsUseCase: FreezeFinancialsUseCase,
  ) {}

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
    try {
      return await this.freezeFinancialsUseCase.execute({
        periodId: id,
        frozenById: req.user.id,
        userRoles: req.user.roles ?? [],
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Обработка ошибок ───

  private handleError(error: unknown): never {
    if (error instanceof NotFoundError) {
      throw { statusCode: HttpStatus.NOT_FOUND, message: error.message, code: error.code };
    }
    if (error instanceof DomainStateError) {
      throw { statusCode: HttpStatus.CONFLICT, message: error.message, code: error.code };
    }
    if (error instanceof UnauthorizedError) {
      throw { statusCode: HttpStatus.FORBIDDEN, message: error.message, code: error.code };
    }
    this.logger.error(`Unexpected error: ${(error as Error).message}`, (error as Error).stack);
    throw { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
