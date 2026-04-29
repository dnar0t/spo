/**
 * GetSyncRunDetailUseCase
 *
 * Use case для получения детальной информации о конкретной синхронизации,
 * включая логи.
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
  SyncRunDetailDto,
} from '../ports/youtrack-repository';

@Injectable()
export class GetSyncRunDetailUseCase {
  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youTrackRepository: IYouTrackRepository,
  ) {}

  async execute(id: string): Promise<SyncRunDetailDto | null> {
    return this.youTrackRepository.getSyncRunDetail(id);
  }
}
