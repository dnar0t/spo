/**
 * RetentionCronService
 *
 * Сервис для периодического запуска очистки данных по расписанию.
 *
 * Для работы требуется пакет `@nestjs/schedule`:
 *   npm install --save @nestjs/schedule
 *
 * После установки:
 *   1. Импортировать ScheduleModule в AppModule:
 *        import { ScheduleModule } from '@nestjs/schedule';
 *        ScheduleModule.forRoot()
 *   2. Добавить @Cron('0 0 * * *') над методом handleCron()
 *
 * Пока пакет не установлен, можно вызывать runRetentionNow() через API.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RetentionService, RetentionRunResult } from './retention.service';

@Injectable()
export class RetentionCronService {
  private readonly logger = new Logger(RetentionCronService.name);

  constructor(private readonly retentionService: RetentionService) {}

  /**
   * Запуск retention cleanup по расписанию (ежедневно в полночь).
   *
   * Требуется @nestjs/schedule с декоратором @Cron.
   * Раскомментировать после установки пакета:
   *
   * @Cron('0 0 * * *')  // каждый день в 00:00
   */
  async handleCron(): Promise<void> {
    this.logger.log('Retention cron: starting scheduled cleanup...');

    try {
      const result = await this.retentionService.cleanup();
      this.logger.log(
        `Retention cron: completed — deleted ${result.totalDeleted} records in ${result.duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Retention cron: failed — ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Ручной запуск retention cleanup из API.
   * Возвращает результат выполнения для отображения в админ-панели.
   */
  async runRetentionNow(): Promise<RetentionRunResult> {
    this.logger.log('Retention: manual run requested via API');

    try {
      const result = await this.retentionService.cleanup();
      this.logger.log(
        `Retention: manual run completed — deleted ${result.totalDeleted} records`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Retention: manual run failed — ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
