/**
 * Reporting Module (Infrastructure Layer)
 *
 * Предоставляет реализации репозиториев для модуля Reporting.
 * Импортирует PrismaModule для доступа к БД.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaPersonalReportRepository } from './repositories/prisma-personal-report.repository';
import { PrismaSummaryReportRepository } from './repositories/prisma-summary-report.repository';
import { PrismaManagerEvaluationRepository } from './repositories/prisma-manager-evaluation.repository';
import { PrismaBusinessEvaluationRepository } from './repositories/prisma-business-evaluation.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaPersonalReportRepository,
    PrismaSummaryReportRepository,
    PrismaManagerEvaluationRepository,
    PrismaBusinessEvaluationRepository,
  ],
  exports: [
    PrismaPersonalReportRepository,
    PrismaSummaryReportRepository,
    PrismaManagerEvaluationRepository,
    PrismaBusinessEvaluationRepository,
  ],
})
export class ReportingModule {}
