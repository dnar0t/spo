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
import { PeriodClosingAppModule } from './presentation/controllers/period-closing-app.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    YouTrackModule,
    PlanningAppModule,
    AuthAppModule,
    AdminAppModule,
    ReportingAppModule,
    FinanceAppModule,
    PeriodClosingAppModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
