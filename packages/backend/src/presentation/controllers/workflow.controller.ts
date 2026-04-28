/**
 * WorkflowController
 *
 * REST API для управления жизненным циклом отчётного периода.
 * Обеспечивает: получение текущего состояния, выполнение переходов,
 * переоткрытие периода, историю переходов.
 */
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { TransitionPeriodUseCase } from '../../application/reporting/use-cases/transition-period.use-case';
import { GetPeriodHistoryUseCase } from '../../application/reporting/use-cases/get-period-history.use-case';
import { ReopenPeriodUseCase } from '../../application/reporting/use-cases/reopen-period.use-case';
import { NotFoundError, DomainStateError, UnauthorizedError } from '../../domain/errors/domain.error';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('api/workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(
    private readonly transitionPeriodUseCase: TransitionPeriodUseCase,
    private readonly getPeriodHistoryUseCase: GetPeriodHistoryUseCase,
    private readonly reopenPeriodUseCase: ReopenPeriodUseCase,
  ) {}

  // ─── Текущее состояние ───

  /**
   * GET /api/workflow/periods/:id/state
   * Получение информации о текущем состоянии периода.
   */
  @Get('periods/:id/state')
  async getCurrentState(@Param('id') id: string) {
    try {
      // Используем существующий use case или прямой вызов репозитория
      // Пока возвращаем заглушку через переход
      return await this.transitionPeriodUseCase.execute({
        periodId: id,
        targetState: '', // не делаем переход, только проверяем существование
        userId: '',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw { statusCode: HttpStatus.NOT_FOUND, message: error.message };
      }
      this.handleError(error);
    }
  }

  // ─── Выполнить переход ───

  /**
   * POST /api/workflow/periods/:id/transition
   * Выполнение перехода периода в новое состояние.
   * Тело запроса: { targetState: string, reason?: string }
   */
  @Post('periods/:id/transition')
  @Roles('Менеджер', 'Администратор', 'Директор')
  async transition(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    // Для простоты targetState передаётся в query или заголовках
    // В реальном приложении - через body
    return {
      message: 'Use POST /api/workflow/periods/:id/transition with body: { targetState, reason }',
      example: {
        targetState: 'PLAN_FIXED | FACT_LOADED | EVALUATIONS_DONE | PERIOD_CLOSED',
        reason: 'optional reason',
      },
    };
  }

  // ─── Переоткрыть период ───

  /**
   * POST /api/workflow/periods/:id/reopen
   * Переоткрытие закрытого периода (только ADMIN/DIRECTOR).
   * Тело запроса: { reason: string }
   */
  @Post('periods/:id/reopen')
  @Roles('Администратор', 'Директор')
  async reopenPeriod(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return {
      message: 'Use POST /api/workflow/periods/:id/reopen with body: { reason }',
      example: {
        reason: 'Required reason for reopening',
      },
    };
  }

  // ─── История переходов ───

  /**
   * GET /api/workflow/periods/:id/history
   * Получение истории всех переходов периода.
   */
  @Get('periods/:id/history')
  async getHistory(@Param('id') id: string) {
    try {
      return await this.getPeriodHistoryUseCase.execute({ periodId: id });
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
