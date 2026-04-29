/**
 * GetSyncRunsUseCase
 *
 * Use case для получения истории синхронизаций YouTrack.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
  SyncRunsListDto,
  SyncRunFilter,
} from '../ports/youtrack-repository';

@Injectable()
export class GetSyncRunsUseCase {
  private readonly logger = new Logger(GetSyncRunsUseCase.name);

  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youtrackRepository: IYouTrackRepository,
  ) {}

  /**
   * Выполнить получение списка синхронизаций
   *
   * @param filter - параметры пагинации (limit, offset)
   * @returns список синхронизаций с общим количеством
   */
  async execute(filter: SyncRunFilter): Promise<SyncRunsListDto> {
    this.logger.debug(`Getting sync runs: limit=${filter.limit}, offset=${filter.offset}`);
    return this.youtrackRepository.getSyncRuns(filter);
  }
}
