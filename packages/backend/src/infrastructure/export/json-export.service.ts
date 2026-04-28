/**
 * JsonExportService (Infrastructure Layer)
 *
 * Реализация IExportService для JSON формата.
 * Генерирует структурированный JSON для бухгалтерии с данными о периоде,
 * сотрудниках, задачах и финансовых показателях.
 * Данные извлекаются через Prisma репозитории.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IExportService } from '../../../application/export/ports/export-service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JsonExportService implements IExportService {
  private readonly logger = new Logger(JsonExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportPlan(periodId: string): Promise<Buffer> {
    const period = await this.prisma.reportingPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new Error(`ReportingPeriod with id "${periodId}" not found`);
    }

    const tasks = await this.prisma.plannedTask.findMany({
      where: { periodId },
      orderBy: { sortOrder: 'asc' },
    });

    const data = {
      type: 'PLAN',
      period: {
        id: period.id,
        month: period.month,
        year: period.year,
        state: period.state,
      },
      tasks: tasks.map(t => ({
        id: t.id,
        issueNumber: t.issueNumber,
        summary: t.summary,
        assigneeId: t.assigneeId,
        estimationMinutes: t.estimationMinutes,
        plannedDevMinutes: t.plannedDevMinutes,
        plannedTestMinutes: t.plannedTestMinutes,
        plannedMgmtMinutes: t.plannedMgmtMinutes,
        plannedDebugMinutes: t.plannedDebugMinutes,
        readinessPercent: t.readinessPercent,
        isPlanned: t.isPlanned,
        parentIssueNumber: t.parentIssueNumber,
        sortOrder: t.sortOrder,
      })),
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  async exportSummaryReport(periodId: string): Promise<Buffer> {
    const period = await this.prisma.reportingPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new Error(`ReportingPeriod with id "${periodId}" not found`);
    }

    const summaryLines = await this.prisma.summaryReport.findMany({
      where: { periodId },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      type: 'SUMMARY_REPORT',
      period: {
        id: period.id,
        month: period.month,
        year: period.year,
        state: period.state,
      },
      lines: summaryLines.map(l => ({
        id: l.id,
        issueNumber: l.issueNumber,
        summary: l.summary,
        systemName: l.systemName,
        projectName: l.projectName,
        typeName: l.typeName,
        priorityName: l.priorityName,
        stateName: l.stateName,
        assigneeId: l.assigneeId,
        assigneeName: l.assigneeName,
        isPlanned: l.isPlanned,
        readinessPercent: l.readinessPercent,
        plannedDevMinutes: l.plannedDevMinutes,
        plannedTestMinutes: l.plannedTestMinutes,
        plannedMgmtMinutes: l.plannedMgmtMinutes,
        actualDevMinutes: l.actualDevMinutes,
        actualTestMinutes: l.actualTestMinutes,
        actualMgmtMinutes: l.actualMgmtMinutes,
        remainingMinutes: l.remainingMinutes,
        plannedCost: l.plannedCost,
        actualCost: l.actualCost,
        remainingCost: l.remainingCost,
        businessEvaluationType: l.businessEvaluationType,
        managerEvaluationType: l.managerEvaluationType,
        managerComment: l.managerComment,
      })),
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  async exportPersonalReport(periodId: string, userId: string): Promise<Buffer> {
    const personalReports = await this.prisma.personalReport.findMany({
      where: { periodId, userId },
      orderBy: { sortOrder: 'asc' },
    });

    const data = {
      type: 'PERSONAL_REPORT',
      periodId,
      userId,
      lines: personalReports.map(r => ({
        id: r.id,
        issueNumber: r.issueNumber,
        summary: r.summary,
        stateName: r.stateName,
        parentIssueNumber: r.parentIssueNumber,
        estimationMinutes: r.estimationMinutes,
        actualMinutes: r.actualMinutes,
        isPlanned: r.isPlanned,
        readinessPercent: r.readinessPercent,
        plannedDevMinutes: r.plannedDevMinutes,
        plannedTestMinutes: r.plannedTestMinutes,
        plannedMgmtMinutes: r.plannedMgmtMinutes,
        actualDevMinutes: r.actualDevMinutes,
        actualTestMinutes: r.actualTestMinutes,
        actualMgmtMinutes: r.actualMgmtMinutes,
        remainingMinutes: r.remainingMinutes,
        baseAmount: r.baseAmount,
        managerEvaluationType: r.managerEvaluationType,
        managerPercent: r.managerPercent,
        managerAmount: r.managerAmount,
        businessEvaluationType: r.businessEvaluationType,
        businessPercent: r.businessPercent,
        businessAmount: r.businessAmount,
        totalOnHand: r.totalOnHand,
        ndfl: r.ndfl,
        insurance: r.insurance,
        reserveVacation: r.reserveVacation,
        totalWithTax: r.totalWithTax,
        effectiveRate: r.effectiveRate,
      })),
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  async exportAuditLog(params: { periodId?: string; userId?: string; fromDate?: Date; toDate?: Date }): Promise<Buffer> {
    const where: Record<string, unknown> = {};

    if (params.periodId) where['periodId'] = params.periodId;
    if (params.userId) where['userId'] = params.userId;
    if (params.fromDate || params.toDate) {
      where['createdAt'] = {};
      if (params.fromDate) (where['createdAt'] as Record<string, unknown>)['gte'] = params.fromDate;
      if (params.toDate) (where['createdAt'] as Record<string, unknown>)['lte'] = params.toDate;
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      type: 'AUDIT_LOG',
      filters: params,
      records: auditLogs.map(a => ({
        id: a.id,
        userId: a.userId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        changes: a.changes,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  async exportJsonAccounting(periodId: string): Promise<Buffer> {
    // Получаем период с сотрудниками и задачами
    const period = await this.prisma.reportingPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new Error(`ReportingPeriod with id "${periodId}" not found`);
    }

    // Получаем личные отчёты (финансовые данные по сотрудникам)
    const personalReports = await this.prisma.personalReport.findMany({
      where: { periodId },
    });

    // Получаем сводный отчёт (агрегированные данные по задачам)
    const summaryLines = await this.prisma.summaryReport.findMany({
      where: { periodId },
    });

    // Получаем сотрудников (из личных отчётов уникальные userId)
    const userIds = [...new Set(personalReports.map(r => r.userId))];
    const employees = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const data = {
      type: 'ACCOUNTING_EXPORT',
      version: '1.0',
      period: {
        id: period.id,
        month: period.month,
        year: period.year,
        state: period.state,
      },
      employees: userIds.map(uid => {
        const emp = employeeMap.get(uid);
        const empReports = personalReports.filter(r => r.userId === uid);

        return {
          userId: uid,
          fullName: emp?.fullName ?? emp?.login ?? uid,
          totalBaseAmount: empReports.reduce((sum, r) => sum + (r.baseAmount ?? 0), 0),
          totalOnHand: empReports.reduce((sum, r) => sum + (r.totalOnHand ?? 0), 0),
          totalNdfl: empReports.reduce((sum, r) => sum + (r.ndfl ?? 0), 0),
          totalInsurance: empReports.reduce((sum, r) => sum + (r.insurance ?? 0), 0),
          totalReserveVacation: empReports.reduce((sum, r) => sum + (r.reserveVacation ?? 0), 0),
          totalWithTax: empReports.reduce((sum, r) => sum + (r.totalWithTax ?? 0), 0),
          totalMinutes: empReports.reduce((sum, r) => sum + (r.actualMinutes ?? 0), 0),
        };
      }),
      tasks: summaryLines.map(l => ({
        issueNumber: l.issueNumber,
        summary: l.summary,
        assigneeId: l.assigneeId,
        assigneeName: l.assigneeName,
        plannedCost: l.plannedCost,
        actualCost: l.actualCost,
        remainingCost: l.remainingCost,
        plannedDevMinutes: l.plannedDevMinutes,
        plannedTestMinutes: l.plannedTestMinutes,
        actualDevMinutes: l.actualDevMinutes,
        actualTestMinutes: l.actualTestMinutes,
      })),
      totals: {
        totalPlannedCost: summaryLines.reduce((sum, l) => sum + (l.plannedCost ?? 0), 0),
        totalActualCost: summaryLines.reduce((sum, l) => sum + (l.actualCost ?? 0), 0),
        totalBaseAmount: personalReports.reduce((sum, r) => sum + (r.baseAmount ?? 0), 0),
        totalOnHand: personalReports.reduce((sum, r) => sum + (r.totalOnHand ?? 0), 0),
        totalNdfl: personalReports.reduce((sum, r) => sum + (r.ndfl ?? 0), 0),
        totalInsurance: personalReports.reduce((sum, r) => sum + (r.insurance ?? 0), 0),
        totalWithTax: personalReports.reduce((sum, r) => sum + (r.totalWithTax ?? 0), 0),
      },
      exportedAt: new Date().toISOString(),
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }
}
