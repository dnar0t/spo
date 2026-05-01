import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaReportingPeriodRepository } from './repositories/prisma-reporting-period.repository';
import { PrismaPlannedTaskRepository } from './repositories/prisma-planned-task.repository';
import { PrismaSprintPlanRepository } from './repositories/prisma-sprint-plan.repository';
import { PrismaPeriodTransitionRepository } from './repositories/prisma-period-transition.repository';
import { PrismaRefreshSessionRepository } from './repositories/prisma-refresh-session.repository';
import { PrismaLoginAttemptRepository } from './repositories/prisma-login-attempt.repository';
import { PrismaEmployeeProfileRepository } from './repositories/prisma-employee-profile.repository';
import { PrismaEmployeeRateRepository } from './repositories/prisma-employee-rate.repository';
import { PrismaFormulaConfigRepository } from './repositories/prisma-formula-config.repository';
import { PrismaEvaluationScaleRepository } from './repositories/prisma-evaluation-scale.repository';
import { PrismaWorkRoleRepository } from './repositories/prisma-work-role.repository';
import { PrismaPlanningSettingsRepository } from './repositories/prisma-planning-settings.repository';
import { PrismaPersonalReportRepository } from './repositories/prisma-personal-report.repository';
import { PrismaTimesheetRepository } from './repositories/prisma-timesheet.repository';
import { PrismaSummaryReportRepository } from './repositories/prisma-summary-report.repository';
import { PrismaManagerEvaluationRepository } from './repositories/prisma-manager-evaluation.repository';
import { PrismaBusinessEvaluationRepository } from './repositories/prisma-business-evaluation.repository';
import { PrismaNotificationTemplateRepository } from './repositories/prisma-notification-template.repository';
import { PrismaNotificationRunRepository } from './repositories/prisma-notification-run.repository';
import { PrismaSmtpConfigRepository } from './repositories/prisma-smtp-config.repository';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { PrismaPeriodSnapshotRepository } from './repositories/prisma-period-snapshot.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUserRepository,

    PrismaReportingPeriodRepository,
    PrismaPlannedTaskRepository,
    PrismaSprintPlanRepository,
    PrismaPeriodTransitionRepository,
    PrismaRefreshSessionRepository,
    PrismaLoginAttemptRepository,
    PrismaEmployeeProfileRepository,
    PrismaEmployeeRateRepository,
    PrismaFormulaConfigRepository,
    PrismaEvaluationScaleRepository,
    PrismaWorkRoleRepository,
    PrismaPlanningSettingsRepository,
    PrismaPersonalReportRepository,
    PrismaTimesheetRepository,
    PrismaSummaryReportRepository,
    PrismaManagerEvaluationRepository,
    PrismaBusinessEvaluationRepository,
    PrismaNotificationTemplateRepository,
    PrismaNotificationRunRepository,
    PrismaSmtpConfigRepository,
    PrismaAuditLogRepository,
    PrismaPeriodSnapshotRepository,
  ],
  exports: [
    PrismaService,
    PrismaUserRepository,

    PrismaReportingPeriodRepository,
    PrismaPlannedTaskRepository,
    PrismaSprintPlanRepository,
    PrismaPeriodTransitionRepository,
    PrismaRefreshSessionRepository,
    PrismaLoginAttemptRepository,
    PrismaEmployeeProfileRepository,
    PrismaEmployeeRateRepository,
    PrismaFormulaConfigRepository,
    PrismaEvaluationScaleRepository,
    PrismaWorkRoleRepository,
    PrismaPlanningSettingsRepository,
    PrismaPersonalReportRepository,
    PrismaTimesheetRepository,
    PrismaSummaryReportRepository,
    PrismaManagerEvaluationRepository,
    PrismaBusinessEvaluationRepository,
    PrismaNotificationTemplateRepository,
    PrismaNotificationRunRepository,
    PrismaSmtpConfigRepository,
    PrismaAuditLogRepository,
    PrismaPeriodSnapshotRepository,
  ],
})
export class PrismaModule {}
