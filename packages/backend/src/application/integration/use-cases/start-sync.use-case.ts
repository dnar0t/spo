import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
  StartSyncResultDto,
} from '../ports/youtrack-repository';

export interface RunYouTrackSyncParams {
  periodId?: number;
}

@Injectable()
export class RunYouTrackSyncUseCase {
  private readonly logger = new Logger(RunYouTrackSyncUseCase.name);

  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youtrackRepository: IYouTrackRepository,
  ) {}

  async execute(params?: RunYouTrackSyncParams): Promise<StartSyncResultDto> {
    this.logger.log('Manual sync requested via use case');

    const result = await this.youtrackRepository.startSync(params?.periodId);

    return result;
  }
}
