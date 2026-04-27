import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    }
  }

  private async connectWithRetry(maxRetries = 3, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
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
