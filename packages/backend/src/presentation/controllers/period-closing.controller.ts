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
import { Controller, Get, Post, Param, Body, UseGuards, Req, Logger, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import { ClosePeriodUseCase } from '../../application/planning/use-cases/close-period.use-case';
import { GetPeriodReadinessUseCase } from '../../application/planning/use-cases/get-period-readiness.use-case';
import { ReopenPeriodUseCase } from '../../application/reporting/use-cases/reopen-period.use-case';
import { PeriodSnapshotRepository } from '../../domain/repositories/period-snapshot.repository';
import { PrismaPeriodSnapshotRepository } from '../../infrastructure/prisma/repositories/prisma-period-snapshot.repository';
import { NotFoundError } from '../../domain/errors/domain.error';

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

@Controller('periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodClosingController {
  private readonly logger = new Logger(PeriodClosingController.name);

  constructor(
    private readonly closePeriodUseCase: ClosePeriodUseCase,
    private readonly reopenPeriodUseCase: ReopenPeriodUseCase,
    private readonly getPeriodReadinessUseCase: GetPeriodReadinessUseCase,
    @Inject(PrismaPeriodSnapshotRepository)
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
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async closePeriod(
    @Param('id') id: string,
    @Body() body: ClosePeriodBody,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.closePeriodUseCase.execute({
      periodId: id,
      userId: req.user.id,
      userRoles: req.user.roles ?? [],
      reason: body.reason,
    });

    return {
      periodId: result.periodId,
      previousState: result.previousState,
      currentState: result.currentState,
      closedAt: result.closedAt,
      snapshotId: result.snapshotId,
    };
  }

  // ─── Переоткрыть период ───

  /**
   * POST /api/periods/:id/reopen
   * Переоткрытие закрытого периода (только ADMIN / DIRECTOR).
   * Удаляет снэпшот данных, переводит период в PERIOD_REOPENED.
   */
  @Post(':id/reopen')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async reopenPeriod(
    @Param('id') id: string,
    @Body() body: ReopenPeriodBody,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.reopenPeriodUseCase.execute({
      periodId: id,
      userId: req.user.id,
      userRoles: req.user.roles ?? [],
      reason: body.reason,
    });

    return {
      periodId: result.periodId,
      previousState: result.previousState,
      currentState: result.currentState,
      reopenedAt: result.reopenedAt,
      reopenReason: result.reopenReason,
    };
  }

  // ─── Получить снэпшот ───

  /**
   * GET /api/periods/:id/snapshot
   * Получение данных снэпшота закрытого периода.
   * Доступно: ADMIN, DIRECTOR, HR, FINANCE.
   */
  @Get(':id/snapshot')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.HR, ROLES.FINANCE)
  async getSnapshot(@Param('id') id: string) {
    const snapshot = await this.periodSnapshotRepository.findByPeriodId(id);
    if (!snapshot) {
      throw new NotFoundError('PeriodSnapshot', id);
    }

    return {
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
    };
  }

  // ─── Проверить существование снэпшота ───

  /**
   * GET /api/periods/:id/snapshot/status
   * Проверка, существует ли снэпшот для указанного периода.
   * Доступно: ADMIN, DIRECTOR, HR, FINANCE.
   */
  @Get(':id/snapshot/status')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.HR, ROLES.FINANCE)
  async getSnapshotStatus(@Param('id') id: string) {
    const snapshot = await this.periodSnapshotRepository.findByPeriodId(id);

    return {
      periodId: id,
      hasSnapshot: snapshot !== null,
      snapshotId: snapshot?.id ?? null,
      createdAt: snapshot?.createdAt?.toISOString() ?? null,
    };
  }

  // ─── Проверить готовность к закрытию периода ───

  /**
   * GET /api/periods/:id/readiness
   * Чек-лист готовности периода к закрытию (только ADMIN / DIRECTOR).
   * Проверяет: зафиксирован ли план, отправлены ли табели,
   * проставлены ли оценки.
   */
  @Get(':id/readiness')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async getReadiness(@Param('id') id: string) {
    return await this.getPeriodReadinessUseCase.execute(id);
  }
}
