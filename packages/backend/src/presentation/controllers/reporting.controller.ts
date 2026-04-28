/**
 * ReportingController
 *
 * REST API для модуля Reporting.
 * Обеспечивает получение итоговых и личных отчётов, работу с оценками,
 * пересчёт отчётов.
 */
import {
  Controller,
  Get,
  Post,
  Put,
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
import { GetSummaryReportUseCase } from '../../application/reporting/use-cases/get-summary-report.use-case';
import { GetPersonalReportUseCase } from '../../application/reporting/use-cases/get-personal-report.use-case';
import { GetPeriodStatisticsUseCase } from '../../application/reporting/use-cases/get-period-statistics.use-case';
import { SubmitManagerEvaluationUseCase } from '../../application/reporting/use-cases/submit-manager-evaluation.use-case';
import { SubmitBusinessEvaluationUseCase } from '../../application/reporting/use-cases/submit-business-evaluation.use-case';
import { GeneratePersonalReportsUseCase } from '../../application/reporting/use-cases/generate-personal-reports.use-case';
import { GenerateSummaryReportUseCase } from '../../application/reporting/use-cases/generate-summary-report.use-case';
import {
  CreateManagerEvaluationRequestDto,
  UpdateManagerEvaluationRequestDto,
  CreateBusinessEvaluationRequestDto,
  UpdateBusinessEvaluationRequestDto,
} from '../../application/reporting/dto/evaluation.dto';
import { ManagerEvaluationRepository } from '../../domain/repositories/manager-evaluation.repository';
import { BusinessEvaluationRepository } from '../../domain/repositories/business-evaluation.repository';
import { ManagerEvaluation } from '../../domain/entities/manager-evaluation.entity';
import { BusinessEvaluation } from '../../domain/entities/business-evaluation.entity';
import { Percentage } from '../../domain/value-objects/percentage.vo';
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

@Controller('api/reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(
    private readonly getSummaryReportUseCase: GetSummaryReportUseCase,
    private readonly getPersonalReportUseCase: GetPersonalReportUseCase,
    private readonly getPeriodStatisticsUseCase: GetPeriodStatisticsUseCase,
    private readonly submitManagerEvaluationUseCase: SubmitManagerEvaluationUseCase,
    private readonly submitBusinessEvaluationUseCase: SubmitBusinessEvaluationUseCase,
    private readonly generatePersonalReportsUseCase: GeneratePersonalReportsUseCase,
    private readonly generateSummaryReportUseCase: GenerateSummaryReportUseCase,
    private readonly managerEvaluationRepository: ManagerEvaluationRepository,
    private readonly businessEvaluationRepository: BusinessEvaluationRepository,
  ) {}

  // ─── Итоговый отчёт ───

  /**
   * GET /api/reporting/periods/:id/summary
   * Получение итогового отчёта периода с фильтрацией, сортировкой и пагинацией.
   */
  @Get('periods/:id/summary')
  async getSummaryReport(
    @Param('id') id: string,
    @Query('system') system?: string,
    @Query('groupBy') groupBy?: string,
    @Query('isPlanned') isPlanned?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    try {
      const result = await this.getSummaryReportUseCase.execute({
        periodId: id,
        system,
        groupBy,
        isPlanned: isPlanned !== undefined ? isPlanned === 'true' : undefined,
        search,
        sortField,
        sortOrder,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
      });

      return {
        period: result.summary['period'],
        statistics: result.statistics,
        groups: result.summary['groups'],
        page: result.summary['page'],
        pageSize: result.summary['pageSize'],
        total: result.summary['total'],
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Статистика периода ───

  /**
   * GET /api/reporting/periods/:id/statistics
   * Получение статистики выполнения плана за период.
   */
  @Get('periods/:id/statistics')
  async getStatistics(@Param('id') id: string) {
    try {
      return await this.getPeriodStatisticsUseCase.execute({ periodId: id });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Личные отчёты ───

  /**
   * GET /api/reporting/periods/:id/personal/me
   * Получение своего личного отчёта.
   */
  @Get('periods/:id/personal/me')
  async getMyPersonalReport(@Param('id') id: string, @Req() req: RequestWithUser) {
    try {
      return await this.getPersonalReportUseCase.execute({
        periodId: id,
        targetUserId: req.user.id,
        viewerId: req.user.id,
        viewerRoles: req.user.roles ?? [],
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * GET /api/reporting/periods/:id/personal/:userId
   * Получение личного отчёта сотрудника (с ABAC проверкой).
   */
  @Get('periods/:id/personal/:userId')
  async getPersonalReport(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.getPersonalReportUseCase.execute({
        periodId: id,
        targetUserId: userId,
        viewerId: req.user.id,
        viewerRoles: req.user.roles ?? [],
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Оценка руководителя ───

  /**
   * POST /api/reporting/evaluations/manager
   * Создание оценки руководителя.
   */
  @Post('evaluations/manager')
  @Roles('Менеджер', 'Администратор', 'Директор')
  async createManagerEvaluation(
    @Body() body: CreateManagerEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.submitManagerEvaluationUseCase.execute({
        periodId: body.periodId,
        youtrackIssueId: body.youtrackIssueId,
        userId: body.userId,
        evaluationType: body.evaluationType,
        percent: body.percent,
        comment: body.comment,
        evaluatedById: req.user.id,
        evaluatorRoles: req.user.roles ?? [],
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * PUT /api/reporting/evaluations/manager/:id
   * Обновление оценки руководителя по ID.
   */
  @Put('evaluations/manager/:id')
  @Roles('Менеджер', 'Администратор', 'Директор')
  async updateManagerEvaluation(
    @Param('id') id: string,
    @Body() body: UpdateManagerEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const existing = await this.managerEvaluationRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('ManagerEvaluation', id);
      }

      existing.update({
        evaluationType: body.evaluationType ?? existing.evaluationType,
        percent:
          body.percent !== null && body.percent !== undefined
            ? Percentage.fromPercent(body.percent)
            : existing.percent,
        comment: body.comment !== undefined ? body.comment : existing.comment,
        evaluatedById: req.user.id,
      });

      const saved = await this.managerEvaluationRepository.update(existing);
      return {
        id: saved.id,
        evaluationType: saved.evaluationType,
        percent: saved.percent?.basisPoints ?? null,
        comment: saved.comment,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Оценка бизнеса ───

  /**
   * POST /api/reporting/evaluations/business
   * Создание бизнес-оценки.
   */
  @Post('evaluations/business')
  @Roles('Бизнес-оценщик', 'Администратор', 'Директор')
  async createBusinessEvaluation(
    @Body() body: CreateBusinessEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.submitBusinessEvaluationUseCase.execute({
        periodId: body.periodId,
        youtrackIssueId: body.youtrackIssueId,
        evaluationType: body.evaluationType,
        percent: body.percent,
        comment: body.comment,
        evaluatedById: req.user.id,
        evaluatorRoles: req.user.roles ?? [],
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * PUT /api/reporting/evaluations/business/:id
   * Обновление бизнес-оценки по ID.
   */
  @Put('evaluations/business/:id')
  @Roles('Бизнес-оценщик', 'Администратор', 'Директор')
  async updateBusinessEvaluation(
    @Param('id') id: string,
    @Body() body: UpdateBusinessEvaluationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    try {
      const existing = await this.businessEvaluationRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('BusinessEvaluation', id);
      }

      existing.update({
        evaluationType: body.evaluationType ?? existing.evaluationType,
        percent:
          body.percent !== null && body.percent !== undefined
            ? Percentage.fromPercent(body.percent)
            : existing.percent,
        comment: body.comment !== undefined ? body.comment : existing.comment,
        evaluatedById: req.user.id,
      });

      const saved = await this.businessEvaluationRepository.update(existing);
      return {
        id: saved.id,
        evaluationType: saved.evaluationType,
        percent: saved.percent?.basisPoints ?? null,
        comment: saved.comment,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ─── Пересчёт отчётов ───

  /**
   * POST /api/reporting/periods/:id/recalculate
   * Пересчёт отчётов периода (только ADMIN).
   */
  @Post('periods/:id/recalculate')
  @Roles('Администратор', 'Директор')
  async recalculateReports(@Param('id') id: string) {
    try {
      const personalResult = await this.generatePersonalReportsUseCase.execute({
        periodId: id,
      });

      const summaryResult = await this.generateSummaryReportUseCase.execute({
        periodId: id,
      });

      return {
        personalReportsGenerated: personalResult.generatedCount,
        summaryReportsGenerated: summaryResult.generatedCount,
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
    this.logger.error(`Unexpected error: ${(error as Error).message}`, (error as Error).stack);
    throw { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
