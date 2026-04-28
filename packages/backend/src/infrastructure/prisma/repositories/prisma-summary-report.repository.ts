/**
 * PrismaSummaryReportRepository
 *
 * Prisma-реализация репозитория SummaryReportRepository.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SummaryReportRepository } from '../../../domain/repositories/summary-report.repository';
import { SummaryReport } from '../../../domain/entities/summary-report.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaSummaryReportRepository implements SummaryReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SummaryReport | null> {
    const data = await this.prisma.periodSummaryReport.findUnique({
      where: { id },
    });
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByPeriodId(periodId: string): Promise<SummaryReport[]> {
    // PeriodSummaryReport - одна запись на период со снапшотом
    // Для получения строк используем dataSnapshot
    const data = await this.prisma.periodSummaryReport.findUnique({
      where: { periodId },
    });
    if (!data) return [];

    // Извлекаем строки из snapshot
    const snapshot = data.dataSnapshot as Record<string, unknown> | null;
    if (!snapshot || !snapshot.lines) return [];

    const lines = snapshot.lines as Array<Record<string, unknown>>;
    return lines.map((line) =>
      SummaryReport.fromPersistence({
        id: (line.id as string) ?? crypto.randomUUID(),
        periodId,
        systemName: (line.systemName as string) ?? null,
        projectName: (line.projectName as string) ?? null,
        groupLevel: (line.groupLevel as string) ?? null,
        groupKey: (line.groupKey as string) ?? null,
        issueNumber: (line.issueNumber as string) ?? '',
        summary: (line.summary as string) ?? '',
        typeName: (line.typeName as string) ?? null,
        priorityName: (line.priorityName as string) ?? null,
        stateName: (line.stateName as string) ?? null,
        assigneeId: (line.assigneeId as string) ?? null,
        assigneeName: (line.assigneeName as string) ?? null,
        isPlanned: (line.isPlanned as boolean) ?? false,
        readinessPercent: (line.readinessPercent as number) ?? null,
        plannedDevMinutes: (line.plannedDevMinutes as number) ?? null,
        plannedTestMinutes: (line.plannedTestMinutes as number) ?? null,
        plannedMgmtMinutes: (line.plannedMgmtMinutes as number) ?? null,
        actualDevMinutes: (line.actualDevMinutes as number) ?? null,
        actualTestMinutes: (line.actualTestMinutes as number) ?? null,
        actualMgmtMinutes: (line.actualMgmtMinutes as number) ?? null,
        remainingMinutes: (line.remainingMinutes as number) ?? null,
        plannedCost: (line.plannedCost as number) ?? null,
        actualCost: (line.actualCost as number) ?? null,
        remainingCost: (line.remainingCost as number) ?? null,
        businessEvaluationType: (line.businessEvaluationType as string) ?? null,
        managerEvaluationType: (line.managerEvaluationType as string) ?? null,
        managerComment: (line.managerComment as string) ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }),
    );
  }

  async findByPeriodGrouped(periodId: string, groupByLevel: string): Promise<SummaryReport[]> {
    const lines = await this.findByPeriodId(periodId);
    return lines.filter((l) => l.groupLevel === groupByLevel);
  }

  async save(entity: SummaryReport): Promise<SummaryReport> {
    // Для PeriodSummaryReport мы сохраняем через upsert, т.к. это одна запись на период
    const persistence = entity.toPersistence();

    // Проверяем существование записи периода
    const existing = await this.prisma.periodSummaryReport.findUnique({
      where: { periodId: entity.periodId },
    });

    if (existing) {
      // Добавляем строку в существующий snapshot
      const existingSnapshot = (existing.dataSnapshot as Record<string, unknown>) ?? {};
      const existingLines = ((existingSnapshot.lines as Array<Record<string, unknown>>) ?? []);
      existingLines.push({
        id: persistence.id,
        systemName: persistence.system_name,
        projectName: persistence.project_name,
        groupLevel: persistence.group_level,
        groupKey: persistence.group_key,
        issueNumber: persistence.issue_number,
        summary: persistence.summary,
        typeName: persistence.type_name,
        priorityName: persistence.priority_name,
        stateName: persistence.state_name,
        assigneeId: persistence.assignee_id,
        assigneeName: persistence.assignee_name,
        isPlanned: persistence.is_planned,
        readinessPercent: persistence.readiness_percent,
        plannedDevMinutes: persistence.planned_dev_minutes,
        plannedTestMinutes: persistence.planned_test_minutes,
        plannedMgmtMinutes: persistence.planned_mgmt_minutes,
        actualDevMinutes: persistence.actual_dev_minutes,
        actualTestMinutes: persistence.actual_test_minutes,
        actualMgmtMinutes: persistence.actual_mgmt_minutes,
        remainingMinutes: persistence.remaining_minutes,
        plannedCost: persistence.planned_cost,
        actualCost: persistence.actual_cost,
        remainingCost: persistence.remaining_cost,
        businessEvaluationType: persistence.business_evaluation_type,
        managerEvaluationType: persistence.manager_evaluation_type,
        managerComment: persistence.manager_comment,
      });

      const updated = await this.prisma.periodSummaryReport.update({
        where: { id: existing.id },
        data: {
          dataSnapshot: { ...existingSnapshot, lines: existingLines },
          calculatedAt: new Date(),
        },
      });
      return this.toDomain(updated);
    }

    // Создаём новую запись
    const data = await this.prisma.periodSummaryReport.create({
      data: {
        id: persistence.id as string,
        periodId: entity.periodId,
        totalPlannedMinutes: persistence.planned_dev_minutes as number ?? 0,
        totalActualMinutes: persistence.actual_dev_minutes as number ?? 0,
        totalDeviation: 0,
        completionPercent: 0,
        unplannedMinutes: 0,
        unplannedPercent: 0,
        remainingMinutes: 0,
        unfinishedTasks: 0,
        dataSnapshot: {
          lines: [{
            id: persistence.id,
            systemName: persistence.system_name,
            projectName: persistence.project_name,
            groupLevel: persistence.group_level,
            groupKey: persistence.group_key,
            issueNumber: persistence.issue_number,
            summary: persistence.summary,
            typeName: persistence.type_name,
            priorityName: persistence.priority_name,
            stateName: persistence.state_name,
            assigneeId: persistence.assignee_id,
            assigneeName: persistence.assignee_name,
            isPlanned: persistence.is_planned,
            readinessPercent: persistence.readiness_percent,
            plannedDevMinutes: persistence.planned_dev_minutes,
            plannedTestMinutes: persistence.planned_test_minutes,
            plannedMgmtMinutes: persistence.planned_mgmt_minutes,
            actualDevMinutes: persistence.actual_dev_minutes,
            actualTestMinutes: persistence.actual_test_minutes,
            actualMgmtMinutes: persistence.actual_mgmt_minutes,
            remainingMinutes: persistence.remaining_minutes,
            plannedCost: persistence.planned_cost,
            actualCost: persistence.actual_cost,
            remainingCost: persistence.remaining_cost,
            businessEvaluationType: persistence.business_evaluation_type,
            managerEvaluationType: persistence.manager_evaluation_type,
            managerComment: persistence.manager_comment,
          }],
        },
        isFrozen: false,
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return this.toDomain(data);
  }

  async saveMany(entities: SummaryReport[]): Promise<void> {
    if (entities.length === 0) return;

    const periodId = entities[0].periodId;

    // Группируем строки в одну запись PeriodSummaryReport
    const lines = entities.map((entity) => {
      const p = entity.toPersistence();
      return {
        id: p.id as string,
        systemName: p.system_name,
        projectName: p.project_name,
        groupLevel: p.group_level,
        groupKey: p.group_key,
        issueNumber: p.issue_number,
        summary: p.summary,
        typeName: p.type_name,
        priorityName: p.priority_name,
        stateName: p.state_name,
        assigneeId: p.assignee_id,
        assigneeName: p.assignee_name,
        isPlanned: p.is_planned,
        readinessPercent: p.readiness_percent,
        plannedDevMinutes: p.planned_dev_minutes,
        plannedTestMinutes: p.planned_test_minutes,
        plannedMgmtMinutes: p.planned_mgmt_minutes,
        actualDevMinutes: p.actual_dev_minutes,
        actualTestMinutes: p.actual_test_minutes,
        actualMgmtMinutes: p.actual_mgmt_minutes,
        remainingMinutes: p.remaining_minutes,
        plannedCost: p.planned_cost,
        actualCost: p.actual_cost,
        remainingCost: p.remaining_cost,
        businessEvaluationType: p.business_evaluation_type,
        managerEvaluationType: p.manager_evaluation_type,
        managerComment: p.manager_comment,
      };
    });

    const totalPlanned = entities.reduce((s, e) => s + e.totalPlannedMinutes.minutes, 0);
    const totalActual = entities.reduce((s, e) => s + e.totalActualMinutes.minutes, 0);

    // Upsert the PeriodSummaryReport record
    await this.prisma.periodSummaryReport.upsert({
      where: { periodId },
      create: {
        id: crypto.randomUUID(),
        periodId,
        totalPlannedMinutes: totalPlanned,
        totalActualMinutes: totalActual,
        totalDeviation: totalActual - totalPlanned,
        completionPercent: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 10000) : 0,
        unplannedMinutes: entities.filter((e) => !e.isPlanned).reduce((s, e) => s + e.totalActualMinutes.minutes, 0),
        unplannedPercent: 0,
        remainingMinutes: entities.reduce((s, e) => s + (e.remainingMinutes?.minutes ?? 0), 0),
        unfinishedTasks: entities.filter((e) => (e.remainingMinutes?.minutes ?? 0) > 0).length,
        dataSnapshot: { lines },
        isFrozen: false,
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        totalPlannedMinutes: totalPlanned,
        totalActualMinutes: totalActual,
        totalDeviation: totalActual - totalPlanned,
        completionPercent: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 10000) : 0,
        unplannedMinutes: entities.filter((e) => !e.isPlanned).reduce((s, e) => s + e.totalActualMinutes.minutes, 0),
        remainingMinutes: entities.reduce((s, e) => s + (e.remainingMinutes?.minutes ?? 0), 0),
        unfinishedTasks: entities.filter((e) => (e.remainingMinutes?.minutes ?? 0) > 0).length,
        dataSnapshot: { lines },
        calculatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async deleteByPeriodId(periodId: string): Promise<void> {
    await this.prisma.periodSummaryReport.deleteMany({
      where: { periodId },
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.periodSummaryReport.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('PeriodSummaryReport', id);
    }
  }

  /**
   * Maps Prisma DB model to domain entity.
   */
  private toDomain(data: {
    id: string;
    periodId: string;
    createdAt: Date;
    updatedAt: Date;
  }): SummaryReport {
    return SummaryReport.fromPersistence({
      id: data.id,
      periodId: data.periodId,
      systemName: null,
      projectName: null,
      groupLevel: null,
      groupKey: null,
      issueNumber: '',
      summary: '',
      typeName: null,
      priorityName: null,
      stateName: null,
      assigneeId: null,
      assigneeName: null,
      isPlanned: false,
      readinessPercent: null,
      plannedDevMinutes: null,
      plannedTestMinutes: null,
      plannedMgmtMinutes: null,
      actualDevMinutes: null,
      actualTestMinutes: null,
      actualMgmtMinutes: null,
      remainingMinutes: null,
      plannedCost: null,
      actualCost: null,
      remainingCost: null,
      businessEvaluationType: null,
      managerEvaluationType: null,
      managerComment: null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
