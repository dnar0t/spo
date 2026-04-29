/**
 * GetYouTrackIssuesUseCase
 *
 * Use case для получения списка синхронизированных задач YouTrack
 * с поддержкой пагинации и фильтрации.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IYouTrackRepository, YOUTRACK_REPOSITORY } from '../ports/youtrack-repository';
import { YouTrackIssuesListDto, IssueFilter } from '../ports/youtrack-repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class GetYouTrackIssuesUseCase {
  private readonly logger = new Logger(GetYouTrackIssuesUseCase.name);

  constructor(
    @Inject(YOUTRACK_REPOSITORY)
    private readonly youtrackRepository: IYouTrackRepository,
  ) {}

  async execute(filter: IssueFilter): Promise<YouTrackIssuesListDto> {
    this.logger.debug(`Fetching issues: page=${filter.page}, limit=${filter.limit}`);

    return this.youtrackRepository.getIssues(filter);
  }
}
