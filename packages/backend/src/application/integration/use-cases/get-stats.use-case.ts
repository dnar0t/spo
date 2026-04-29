/**
 * GetYouTrackStatsUseCase
 *
 * Use case для получения статистики по YouTrack-интеграции.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IYouTrackRepository, YOUTRACK_REPOSITORY } from '../ports/youtrack-repository';
import { YouTrackStatsDto } from '../ports/youtrack-repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class GetYouTrackStatsUseCase {
  private readonly logger = new Logger(GetYouTrackStatsUseCase.name);

  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youtrackRepository: IYouTrackRepository,
  ) {}

  async execute(): Promise<YouTrackStatsDto> {
    this.logger.debug('Getting YouTrack integration stats');
    return this.youtrackRepository.getStats();
  }
}
