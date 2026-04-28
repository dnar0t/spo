/**
 * PeriodClosingController
 *
 * REST API для управления закрытием/переоткрытием отчётных периодов
 * и получения снэпшотов данных.
 *
 * Endpoints:
 * - POST /api/periods/:id/close   — закрыть период (ADMIN, DIRECTOR)
 * - POST /api/periods/:id/reopen  — переоткрыть период (ADMIN, DIRECTOR)
 * - GET  /api/periods/:id/snapshot       — получить данные снэпшота
 * - GET  /api/periods/:id/snapshot/status — проверить существование снэпшота
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ClosePeriodUseCase } from '../../application/planning/use-cases/close-period.use-case';
import { ReopenPeriodUseCase } from '../../application/reporting/use-cases/reopen-period.use-case';
import { PeriodSnapshotRepository } from '../../domain/repositories/period-snapshot.repository';
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

class ClosePeriodBody {
  reason?: string;
}

class ReopenPeriodBody {
  reason: string;
}

@Controller('api/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodClosingController {
  private readonly logger = new Logger(PeriodClosingController.name);

  constructor(
    private readonly closePeriodUseCase: ClosePeriodUseCase,
    private readonly reopenPeriodUseCase: ReopenPeriodUseCase,
    private readonly periodSnapshotRepository: PeriodSnapshotRepository,
  ) {}

  // ─── Закрыть период ───

  /**
   * POST /api/periods/:id/close
   * Закрытие отчётного периода (только ADMIN / DIRECTOR).
   * Создаёт снэпшот всех данных, замораживает отчёты,
   * переводит период в состояние PERIOD_CLOSED.
   */
  @Post(':id/close')
  @Roles('Администратор', 'Директор')
  async closePeriod(
    @Param('id') id: string,
    @Body() body: ClosePeriodBody,
    @Req() req: RequestWithUser,
  ) {
    try {
      const result = await this.closePeriodUseCase.execute({
        periodId: id,
        userId: req.user.id,
        userRoles: req.user.roles ?? [],
        reason: body.reason,
      });

      return {
        success: true,
        data: {
          periodId: result.periodId,
          previousState: result.previousState,
          currentState: result.currentState,
          closedAt: result.closedAt,
          snapshotId: result.snapshotId,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Переоткрыть период ───

  /**
   * POST /api/periods/:id/reopen
   * Переоткрытие закрытого периода (только ADMIN / DIRECTOR).
   * Удаляет снэпшот данных, переводит период в PERIOD_REOPENED.
   */
  @Post(':id/reopen')
  @Roles('Администратор', 'Директор')
  async reopenPeriod(
    @Param('id') id: string,
    @Body() body: ReopenPeriodBody,
    @Req() req: RequestWithUser,
  ) {
    try {
      const result = await this.reopenPeriodUseCase.execute({
        periodId: id,
        userId: req.user.id,
        userRoles: req.user.roles ?? [],
        reason: body.reason,
      });

      return {
        success: true,
        data: {
          periodId: result.periodId,
          previousState: result.previousState,
          currentState: result.currentState,
          reopenedAt: result.reopenedAt,
          reopenReason: result.reopenReason,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Получить снэпшот ───

  /**
   * GET /api/periods/:id/snapshot
   * Получение данных снэпшота закрытого периода.
   * Доступно: ADMIN, DIRECTOR, HR, FINANCE.
   */
  @Get(':id/snapshot')
  @Roles('Администратор', 'Директор', 'HR', 'Финансы')
  async getSnapshot(@Param('id') id: string) {
    try {
      const snapshot = await this.periodSnapshotRepository.findByPeriodId(id);
      if (!snapshot) {
        throw { statusCode: HttpStatus.NOT_FOUND, message: `No snapshot found for period ${id}` };
      }

      return {
        success: true,
        data: {
          id: snapshot.id,
          periodId: snapshot.periodId,
          employeeRates: snapshot.employeeRates,
          formulas: snapshot.formulas,
          evaluationScales: snapshot.evaluationScales,
          workItems: snapshot.workItems,
          issues: snapshot.issues,
          issueHierarchy: snapshot.issueHierarchy,
          reportLines: snapshot.reportLines,
          aggregates: snapshot.aggregates,
          createdAt: snapshot.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Проверить существование снэпшота ───

  /**
   * GET /api/periods/:id/snapshot/status
   * Проверка, существует ли снэпшот для указанного периода.
   * Доступно: ADMIN, DIRECTOR, HR, FINANCE.
   */
  @Get(':id/snapshot/status')
  @Roles('Администратор', 'Директор', 'HR', 'Финансы')
  async getSnapshotStatus(@Param('id') id: string) {
    try {
      const snapshot = await this.periodSnapshotRepository.findByPeriodId(id);

      return {
        success: true,
        data: {
          periodId: id,
          hasSnapshot: snapshot !== null,
          snapshotId: snapshot?.id ?? null,
          createdAt: snapshot?.createdAt?.toISOString() ?? null,
        },
      };
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

    // Handle inline errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error;
    }

    this.logger.error(`Unexpected error: ${(error as Error).message}`, (error as Error).stack);
    throw { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
