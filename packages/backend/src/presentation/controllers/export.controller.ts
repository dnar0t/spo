/**
 * ExportController
 *
 * REST API для модуля Export.
 * Предоставляет端点ы для экспорта отчётов, получения статуса задач и скачивания файлов.
 *
 * Endpoints:
 * - POST /api/export/plan/:periodId — экспорт плана (XLSX/PDF)
 * - POST /api/export/summary/:periodId — экспорт сводного отчёта (XLSX/PDF)
 * - POST /api/export/personal/:periodId/:userId — экспорт личного отчёта (XLSX/PDF)
 * - POST /api/export/audit — экспорт аудит-лога (XLSX)
 * - POST /api/export/accounting/:periodId — экспорт JSON для бухгалтерии
 * - GET /api/export/jobs — список задач на экспорт текущего пользователя
 * - GET /api/export/download/:jobId — скачивание файла экспорта
 */
import { Controller, Get, Post, Param, Query, Req, Logger, HttpStatus, Res } from '@nestjs/common';
import { UseGuards, Inject } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import { ExportPlanUseCase } from '../../application/export/use-cases/export-plan.use-case';
import { ExportSummaryReportUseCase } from '../../application/export/use-cases/export-summary-report.use-case';
import { ExportPersonalReportUseCase } from '../../application/export/use-cases/export-personal-report.use-case';
import { ExportAuditLogUseCase } from '../../application/export/use-cases/export-audit-log.use-case';
import { ExportJsonAccountingUseCase } from '../../application/export/use-cases/export-json-accounting.use-case';
import { GetExportJobsUseCase } from '../../application/export/use-cases/get-export-jobs.use-case';
import { CleanupExpiredExportsUseCase } from '../../application/export/use-cases/cleanup-expired-exports.use-case';
import { EXPORT_JOB_REPOSITORY } from '../../domain/repositories/export-job.repository';
import { IFileStorage } from '../../application/export/ports/file-storage';

import { NotFoundError, DomainStateError } from '../../domain/errors/domain.error';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    sessionId?: string;
    roles?: string[];
  };
}

@Controller('api/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(
    private readonly exportPlanUseCase: ExportPlanUseCase,
    private readonly exportSummaryReportUseCase: ExportSummaryReportUseCase,
    private readonly exportPersonalReportUseCase: ExportPersonalReportUseCase,
    private readonly exportAuditLogUseCase: ExportAuditLogUseCase,
    private readonly exportJsonAccountingUseCase: ExportJsonAccountingUseCase,
    private readonly getExportJobsUseCase: GetExportJobsUseCase,
    private readonly cleanupExpiredExportsUseCase: CleanupExpiredExportsUseCase,
    @Inject(EXPORT_JOB_REPOSITORY) private readonly exportJobRepository: any,
    private readonly fileStorage: IFileStorage,
  ) {}

  // ─── Экспорт плана ───

  /**
   * POST /api/export/plan/:periodId
   * Экспорт плана периода в XLSX или PDF.
   * @param periodId ID периода
   * @param format Формат: xlsx | pdf (по умолчанию xlsx)
   */
  @Post('plan/:periodId')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER)
  async exportPlan(
    @Param('periodId') periodId: string,
    @Query('format') format: string,
    @Req() req: RequestWithUser,
  ) {
    const normalizedFormat = this.normalizeFormat(format, 'XLSX');
    return await this.exportPlanUseCase.execute({
      periodId,
      format: normalizedFormat as 'XLSX' | 'PDF',
      userId: req.user.id,
    });
  }

  // ─── Экспорт сводного отчёта ───

  /**
   * POST /api/export/summary/:periodId
   * Экспорт сводного отчёта периода в XLSX или PDF.
   * @param periodId ID периода
   * @param format Формат: xlsx | pdf (по умолчанию xlsx)
   */
  @Post('summary/:periodId')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER)
  async exportSummaryReport(
    @Param('periodId') periodId: string,
    @Query('format') format: string,
    @Req() req: RequestWithUser,
  ) {
    const normalizedFormat = this.normalizeFormat(format, 'XLSX');
    return await this.exportSummaryReportUseCase.execute({
      periodId,
      format: normalizedFormat as 'XLSX' | 'PDF',
      userId: req.user.id,
    });
  }

  // ─── Экспорт личного отчёта ───

  /**
   * POST /api/export/personal/:periodId/:userId
   * Экспорт личного отчёта сотрудника в XLSX или PDF.
   * @param periodId ID периода
   * @param userId ID сотрудника
   * @param format Формат: xlsx | pdf (по умолчанию xlsx)
   */
  @Post('personal/:periodId/:userId')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.EMPLOYEE)
  async exportPersonalReport(
    @Param('periodId') periodId: string,
    @Param('userId') userId: string,
    @Query('format') format: string,
    @Req() req: RequestWithUser,
  ) {
    const normalizedFormat = this.normalizeFormat(format, 'XLSX');
    return await this.exportPersonalReportUseCase.execute({
      periodId,
      userId,
      format: normalizedFormat as 'XLSX' | 'PDF',
      currentUserId: req.user.id,
    });
  }

  // ─── Экспорт аудит-лога ───

  /**
   * POST /api/export/audit
   * Экспорт аудит-лога в XLSX.
   * @param periodId Опциональный фильтр по периоду
   * @param userId Опциональный фильтр по пользователю
   * @param fromDate Опциональная дата начала
   * @param toDate Опциональная дата окончания
   */
  @Post('audit')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
  async exportAuditLog(
    @Query('periodId') periodId: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('fromDate') fromDate: string | undefined,
    @Query('toDate') toDate: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return await this.exportAuditLogUseCase.execute({
      periodId,
      userId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      requesterUserId: req.user.id,
    });
  }

  // ─── Экспорт JSON для бухгалтерии ───

  /**
   * POST /api/export/accounting/:periodId
   * Экспорт данных периода в JSON для бухгалтерии.
   * @param periodId ID периода
   */
  @Post('accounting/:periodId')
  @Roles(ROLES.ACCOUNTANT, ROLES.ADMIN, ROLES.DIRECTOR)
  async exportJsonAccounting(@Param('periodId') periodId: string, @Req() req: RequestWithUser) {
    return await this.exportJsonAccountingUseCase.execute({
      periodId,
      userId: req.user.id,
    });
  }

  // ─── Список задач на экспорт ───

  /**
   * GET /api/export/jobs
   * Получение списка задач на экспорт текущего пользователя.
   */
  @Get('jobs')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.VIEWER)
  async getJobs(@Req() req: RequestWithUser) {
    return await this.getExportJobsUseCase.execute({
      userId: req.user.id,
    });
  }

  // ─── Скачивание файла экспорта ───

  /**
   * GET /api/export/download/:jobId
   * Скачивание файла экспорта по ID задачи.
   * @param jobId ID задачи экспорта
   * @param path Путь к файлу (может быть передан в query как запасной вариант)
   */
  @Get('download/:jobId')
  @Roles(ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.VIEWER)
  async downloadFile(
    @Param('jobId') jobId: string,
    @Query('path') filePath: string | undefined,
    @Res() response: Response,
  ) {
    const job = await this.exportJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundError('ExportJob', jobId);
    }

    if (job.status !== 'COMPLETED') {
      const errorMsg =
        job.status === 'FAILED'
          ? `Export job failed: ${job.error ?? 'Unknown error'}`
          : `Export job is in status "${job.status}". Wait for completion.`;
      throw new DomainStateError(errorMsg, { jobId, status: job.status });
    }

    if (job.isExpired()) {
      throw new DomainStateError('Export file has expired and is no longer available.', {
        jobId,
        expiresAt: job.expiresAt.toISOString(),
      });
    }

    // Путь может быть из query или из сущности задачи
    const targetPath = filePath || job.filePath;
    if (!targetPath) {
      throw new NotFoundError('ExportFile', jobId);
    }

    const buffer = await this.fileStorage.get(targetPath);

    const contentType = this.getContentType(job.fileName ?? '');
    const fileName = job.fileName ?? `export-${jobId}.bin`;

    response.setHeader('Content-Type', contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    response.setHeader('Content-Length', buffer.length);
    response.status(HttpStatus.OK).send(buffer);
  }

  // ─── Утилиты ───

  /**
   * Приводит формат к стандартному виду (XLSX / PDF).
   */
  private normalizeFormat(format: string | undefined, defaultFormat: string): string {
    if (!format) return defaultFormat;
    const upper = format.toUpperCase();
    if (upper === 'XLSX' || upper === 'PDF') return upper;
    if (upper === 'XLS' || upper === 'EXCEL' || upper === 'CSV') return 'XLSX';
    return defaultFormat;
  }

  /**
   * Определяет Content-Type по имени файла.
   */
  private getContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    switch (ext) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      case 'csv':
        return 'text/csv; charset=utf-8';
      default:
        return 'application/octet-stream';
    }
  }
}
