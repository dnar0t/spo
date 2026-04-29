/**
 * GetYouTrackStatusUseCase
 *
 * Use case для получения статуса подключения к YouTrack.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IYouTrackRepository, YOUTRACK_REPOSITORY } from '../ports/youtrack-repository';
import { Inject } from '@nestjs/common';

export class GetYouTrackStatusUseCase {
  private readonly logger = new Logger(GetYouTrackStatusUseCase.name);

  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youTrackRepository: IYouTrackRepository,
  ) {}

  async execute(): Promise<{
    configured: boolean;
    baseUrl: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
  }> {
    this.logger.debug('Getting YouTrack status');
    return this.youTrackRepository.getStatus();
  }
}
