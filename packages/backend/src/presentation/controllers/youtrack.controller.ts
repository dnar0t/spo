/**
 * YouTrack Controller
 *
 * REST API endpoints для управления интеграцией с YouTrack:
 * - GET /api/youtrack/status — статус подключения
 * - POST /api/youtrack/sync — запуск полной синхронизации
 * - GET /api/youtrack/sync-runs — история синхронизаций
 * - GET /api/youtrack/sync-runs/:id — детали синхронизации
 * - GET /api/youtrack/issues — список синхронизированных задач
 * - POST /api/youtrack/test-connection — тест подключения к YouTrack
 * - GET /api/youtrack/stats — статистика по интеграции
 *
 * Контроллер больше не инжектит инфраструктурные сервисы напрямую.
 * Вся логика делегирована use cases из application слоя.
 */
import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { GetYouTrackStatusUseCase } from '../../application/integration/use-cases/get-status.use-case';
import { TestYouTrackConnectionUseCase } from '../../application/integration/use-cases/test-connection.use-case';
import { RunYouTrackSyncUseCase } from '../../application/integration/use-cases/start-sync.use-case';
import { GetSyncRunsUseCase } from '../../application/integration/use-cases/get-sync-runs.use-case';
import { GetSyncRunDetailUseCase } from '../../application/integration/use-cases/get-sync-run-detail.use-case';
import { GetYouTrackIssuesUseCase } from '../../application/integration/use-cases/get-issues.use-case';
import { GetYouTrackStatsUseCase } from '../../application/integration/use-cases/get-stats.use-case';
import {
  SyncRunFilter,
  IssueFilter,
} from '../../application/integration/ports/youtrack-repository';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('youtrack')
export class YouTrackController {
  private readonly logger = new Logger(YouTrackController.name);

  constructor(
    private readonly getStatusUseCase: GetYouTrackStatusUseCase,
    private readonly testConnectionUseCase: TestYouTrackConnectionUseCase,
    private readonly startSyncUseCase: RunYouTrackSyncUseCase,
    private readonly getSyncRunsUseCase: GetSyncRunsUseCase,
    private readonly getSyncRunDetailUseCase: GetSyncRunDetailUseCase,
    private readonly getIssuesUseCase: GetYouTrackIssuesUseCase,
    private readonly getStatsUseCase: GetYouTrackStatsUseCase,
  ) {}

  /**
   * Проверка статуса подключения к YouTrack
   */
  @Roles('admin', 'director', 'manager', 'viewer')
  @Get('status')
  async getStatus() {
    return this.getStatusUseCase.execute();
  }

  /**
   * Тест подключения к YouTrack API
   */
  @Roles('admin', 'director')
  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection() {
    return this.testConnectionUseCase.execute();
  }

  /**
   * Запуск полной синхронизации
   */
  @Roles('admin', 'director')
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async startSync() {
    this.logger.log('Manual sync requested');
    return this.startSyncUseCase.execute();
  }

  /**
   * История синхронизаций
   */
  @Roles('admin', 'director', 'manager', 'viewer')
  @Get('sync-runs')
  async getSyncRuns(@Query('limit') limit: string = '10', @Query('offset') offset: string = '0') {
    const filter: SyncRunFilter = { limit: Number(limit) || 10, offset: Number(offset) || 0 };
    return this.getSyncRunsUseCase.execute(filter);
  }

  /**
   * Детали конкретной синхронизации с логами
   */
  @Roles('admin', 'director', 'manager')
  @Get('sync-runs/:id')
  async getSyncRunDetail(@Param('id') id: string) {
    return this.getSyncRunDetailUseCase.execute(id);
  }

  /**
   * Список синхронизированных задач с фильтрацией
   */
  @Roles('admin', 'director', 'manager', 'viewer')
  @Get('issues')
  async getIssues(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('projectName') projectName?: string,
    @Query('systemName') systemName?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('isResolved') isResolved?: string,
    @Query('search') search?: string,
  ) {
    const filter: IssueFilter = {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      projectName,
      systemName,
      assigneeId,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      search,
    };

    return this.getIssuesUseCase.execute(filter);
  }

  /**
   * Статистика по интеграции
   */
  @Roles('admin', 'director', 'manager', 'viewer')
  @Get('stats')
  async getStats() {
    return this.getStatsUseCase.execute();
  }
}
