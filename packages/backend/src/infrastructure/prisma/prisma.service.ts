import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

type PrismaClientType = {
  [key: string]: any;
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $transaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T>;
  $queryRaw<T = unknown>(query: any, ...values: any[]): Promise<T>;
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private _client!: PrismaClientType;

  constructor() {
    const { createPrismaClient } = require('./prisma-client-factory');
    this._client = createPrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  // ─── Делегирование свойств PrismaClient ───
  get user() {
    return this._client.user;
  }
  get role() {
    return this._client.role;
  }
  get workRole() {
    return this._client.workRole;
  }
  get employeeProfile() {
    return this._client.employeeProfile;
  }
  get userRole() {
    return this._client.userRole;
  }
  get refreshSession() {
    return this._client.refreshSession;
  }
  get loginAttempt() {
    return this._client.loginAttempt;
  }
  get reportingPeriod() {
    return this._client.reportingPeriod;
  }
  get periodTransition() {
    return this._client.periodTransition;
  }
  get sprintPlan() {
    return this._client.sprintPlan;
  }
  get sprintPlanVersion() {
    return this._client.sprintPlanVersion;
  }
  get plannedTask() {
    return this._client.plannedTask;
  }
  get youTrackIssue() {
    return this._client.youTrackIssue;
  }
  get workItem() {
    return this._client.workItem;
  }
  get integrationSetting() {
    return this._client.integrationSetting;
  }
  get syncRun() {
    return this._client.syncRun;
  }
  get syncLogEntry() {
    return this._client.syncLogEntry;
  }
  get managerEvaluation() {
    return this._client.managerEvaluation;
  }
  get businessEvaluation() {
    return this._client.businessEvaluation;
  }
  get personalReport() {
    return this._client.personalReport;
  }
  get personalReportLine() {
    return this._client.personalReportLine;
  }
  get summaryReport() {
    return this._client.summaryReport;
  }
  get employeeRate() {
    return this._client.employeeRate;
  }
  get employeeRateHistory() {
    return this._client.employeeRateHistory;
  }
  get formulaConfiguration() {
    return this._client.formulaConfiguration;
  }
  get formulaConfigurationVersion() {
    return this._client.formulaConfigurationVersion;
  }
  get evaluationScale() {
    return this._client.evaluationScale;
  }
  get notificationTemplate() {
    return this._client.notificationTemplate;
  }
  get notificationRun() {
    return this._client.notificationRun;
  }
  get outboxMessage() {
    return this._client.outboxMessage;
  }
  get auditLog() {
    return this._client.auditLog;
  }
  get periodSnapshot() {
    return this._client.periodSnapshot;
  }
  get planningSetting() {
    return this._client.planningSetting;
  }
  get smtpConfig() {
    return this._client.smtpConfig;
  }
  get exportJob() {
    return this._client.exportJob;
  }
  get timesheet() {
    return this._client.timesheet;
  }
  get workRoleAssignment() {
    return this._client.workRoleAssignment;
  }

  $transaction<T>(fn: (tx: any) => Promise<T>, options?: any): Promise<T> {
    return this._client.$transaction(fn, options);
  }

  $queryRaw<T = unknown>(query: any, ...values: any[]): Promise<T> {
    return this._client.$queryRaw(query, ...values);
  }

  get $client(): PrismaClientType {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this._client.$disconnect();
      this.logger.log('Disconnected from database');
    }
  }

  private async connectWithRetry(maxRetries = 3, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this._client.$connect();
        this.isConnected = true;
        this.logger.log('Successfully connected to database');
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to connect to database (attempt ${attempt}/${maxRetries}): ${(error as Error).message}`,
        );

        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.warn(
            'Could not connect to the database after all retries. ' +
              'The application will start without database connectivity. ' +
              'Please ensure PostgreSQL is running and DATABASE_URL is correctly configured.',
          );
        }
      }
    }
  }
}
