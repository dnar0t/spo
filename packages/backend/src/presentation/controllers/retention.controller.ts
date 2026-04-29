/**
 * RetentionController
 *
 * Контроллер для управления политиками хранения данных (retention policies).
 * Предоставляет endpoints для ручного запуска очистки и просмотра статистики.
 *
 * Все endpoints защищены JwtAuthGuard + RolesGuard с ролью ADMIN.
 */
import { Controller, Post, Get, HttpCode, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import { RetentionCronService } from '../../infrastructure/retention/retention-cron.service';
import { RetentionService } from '../../infrastructure/retention/retention.service';

@Controller('api/admin/retention')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetentionController {
  private readonly logger = new Logger(RetentionController.name);

  constructor(
    private readonly retentionCronService: RetentionCronService,
    private readonly retentionService: RetentionService,
  ) {}

  /**
   * Ручной запуск retention cleanup.
   *
   * POST /api/admin/retention/run
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLES.ADMIN)
  async runRetention() {
    this.logger.log('Manual retention run requested');

    const result = await this.retentionCronService.runRetentionNow();
    return {
      message: 'Retention cleanup completed',
      data: result,
    };
  }

  /**
   * Получить статистику: сколько записей будет удалено при следующем запуске.
   * Фактическое удаление не производится.
   *
   * GET /api/admin/retention/stats
   */
  @Get('stats')
  @Roles(ROLES.ADMIN)
  async getStats() {
    this.logger.log('Retention stats requested');

    const stats = await this.retentionService.getCleanupStats();
    return {
      data: stats,
      retentionConfig: {
        exportFilesDays: Number(process.env.RETENTION_EXPORT_DAYS ?? 1),
        notificationRunsDays: Number(process.env.RETENTION_NOTIFICATION_DAYS ?? 90),
        auditLogsDays: Number(process.env.RETENTION_AUDIT_DAYS ?? 365),
        syncLogEntriesDays: Number(process.env.RETENTION_SYNC_LOG_DAYS ?? 90),
        loginAttemptsDays: Number(process.env.RETENTION_LOGIN_ATTEMPT_DAYS ?? 90),
      },
    };
  }
}
