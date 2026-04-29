/**
 * TestYouTrackConnectionUseCase
 *
 * Use case для проверки подключения к YouTrack API.
 * Делегирует выполнение порту IYouTrackRepository.
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  IYouTrackRepository,
  YOUTRACK_REPOSITORY,
  YouTrackTestConnectionResultDto,
} from '../ports/youtrack-repository';

@Injectable()
export class TestYouTrackConnectionUseCase {
  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youtrackRepository: IYouTrackRepository,
  ) {}

  async execute(): Promise<YouTrackTestConnectionResultDto> {
    return this.youtrackRepository.testConnection();
  }
}
