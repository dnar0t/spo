import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { YouTrackApiClient } from './youtrack-api.client';
import { YouTrackMapper } from './youtrack-mapper';
import { SyncEngine } from './sync-engine';
import { YouTrackController } from '../../presentation/controllers/youtrack.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [YouTrackController],
  providers: [
    YouTrackApiClient,
    YouTrackMapper,
    SyncEngine,
  ],
  exports: [
    YouTrackApiClient,
    YouTrackMapper,
    SyncEngine,
  ],
})
export class YouTrackModule {}
