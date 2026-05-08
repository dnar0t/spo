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

    // Проверяем, настроена ли интеграция (не placeholder)
    const status = await this.youtrackRepository.getStatus();
    const isPlaceholder =
      status.baseUrl &&
      (status.baseUrl.includes('example.com') ||
        status.baseUrl.includes('localhost') ||
        status.baseUrl === 'http://youtrack.example.com');
    if (!status.configured || isPlaceholder) {
      throw new Error(
        'YouTrack не настроен. Укажите реальный URL и токен в Настройки → Интеграции.',
      );
    }

    const result = await this.youtrackRepository.startSync(params?.periodId);

    return result;
  }
}
