import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
  StartSyncResultDto,
} from '../ports/youtrack-repository';
import { SyncRun } from '@prisma/client';

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

    // Проверяем, нет ли уже запущенной синхронизации
    const existingRun = await this.youtrackRepository.hasRunningSync();
    if (existingRun) {
      this.logger.log('A sync is already running, returning existing run ID');
      return {
        message: 'Sync already in progress',
        syncRunId: existingRun.id,
        alreadyRunning: true,
      };
    }

    // Запускаем синхронизацию (startSync создаёт syncRun и запускает фоновый процесс)
    const result = await this.youtrackRepository.startSync(params?.periodId);

    return result;
  }
}
