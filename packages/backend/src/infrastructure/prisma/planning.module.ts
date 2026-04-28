import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaReportingPeriodRepository } from './repositories/prisma-reporting-period.repository';
import { PrismaPlannedTaskRepository } from './repositories/prisma-planned-task.repository';
import { PrismaSprintPlanRepository } from './repositories/prisma-sprint-plan.repository';
import { PrismaPeriodTransitionRepository } from './repositories/prisma-period-transition.repository';

/**
 * Planning Module
 *
 * Предоставляет реализации репозиториев для модуля Sprint Planning.
 * Импортирует PrismaModule для доступа к БД.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    PrismaReportingPeriodRepository,
    PrismaPlannedTaskRepository,
    PrismaSprintPlanRepository,
    PrismaPeriodTransitionRepository,
  ],
  exports: [
    PrismaReportingPeriodRepository,
    PrismaPlannedTaskRepository,
    PrismaSprintPlanRepository,
    PrismaPeriodTransitionRepository,
  ],
})
export class PlanningModule {}
