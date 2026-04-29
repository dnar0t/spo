import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { YouTrackApiClient } from './youtrack-api.client';
import { YouTrackMapper } from './youtrack-mapper';
import { SyncEngine } from './sync-engine';
import { YouTrackExportServiceImpl } from './services/youtrack-export-service.impl';
import { PrismaYouTrackIssueRepository } from './repositories/prisma-youtrack-issue.repository';
import { YOUTRACK_ISSUE_REPOSITORY } from '../../application/finance/ports/youtrack-issue-repository';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [
    YouTrackApiClient,
    YouTrackMapper,
    SyncEngine,
    YouTrackExportServiceImpl,
    {
      provide: YOUTRACK_ISSUE_REPOSITORY,
      useClass: PrismaYouTrackIssueRepository,
    },
  ],
  exports: [
    YouTrackApiClient,
    YouTrackMapper,
    SyncEngine,
    YouTrackExportServiceImpl,
    YOUTRACK_ISSUE_REPOSITORY,
  ],
})
export class YouTrackModule {}
