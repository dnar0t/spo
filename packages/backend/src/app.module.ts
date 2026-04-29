import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { YouTrackModule } from './infrastructure/youtrack/youtrack.module';
import { HealthController } from './presentation/controllers/health.controller';
import { ReportingAppModule } from './presentation/controllers/reporting-app.module';
import { PlanningAppModule } from './presentation/controllers/planning-app.module';
import { AuthAppModule } from './presentation/controllers/auth-app.module';
import { AdminAppModule } from './presentation/controllers/admin-app.module';
import { FinanceAppModule } from './presentation/controllers/finance-app.module';
import { DashboardAppModule } from './presentation/controllers/dashboard-app.module';
import { PeriodClosingAppModule } from './presentation/controllers/period-closing-app.module';
import { ExportAppModule } from './presentation/controllers/export-app.module';
import { NotificationsAppModule } from './presentation/controllers/notifications-app.module';
import { TimesheetAppModule } from './presentation/controllers/timesheet-app.module';
import { IntegrationAppModule } from './presentation/controllers/integration-app.module';
import { SharedModule } from './infrastructure/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    SharedModule,
    PrismaModule,
    YouTrackModule,
    PlanningAppModule,
    AuthAppModule,
    AdminAppModule,
    ReportingAppModule,
    FinanceAppModule,
    PeriodClosingAppModule,
    ExportAppModule,
    NotificationsAppModule,
    TimesheetAppModule,
    DashboardAppModule,
    IntegrationAppModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
