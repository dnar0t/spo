/**
 * RetentionService
 *
 * Сервис для очистки устаревших данных в соответствии с политиками хранения.
 * Запускает очистку для каждой сущности: экспортные файлы, уведомления,
 * журнал аудита, логи синхронизации и попытки входа.
 *
 * Все сроки хранения настраиваются через переменные окружения.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Результат выполнения очистки по одной сущности.
 */
export interface CleanupResult {
  entity: string;
  deletedCount: number;
  freedBytes?: number;
  error?: string;
}

/**
 * Общий результат выполнения всех политик retention.
 */
export interface RetentionRunResult {
  startedAt: string;
  completedAt: string;
  duration: number; // ms
  results: CleanupResult[];
  totalDeleted: number;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  // Периоды хранения (в днях) с дефолтными значениями
  private readonly exportFileRetentionDays: number;
  private readonly notificationRunRetentionDays: number;
  private readonly auditLogRetentionDays: number;
  private readonly syncLogEntryRetentionDays: number;
  private readonly loginAttemptRetentionDays: number;

  // Путь к директории экспорта
  private readonly exportStoragePath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.exportFileRetentionDays = this.configService.get<number>('RETENTION_EXPORT_DAYS', 1);
    this.notificationRunRetentionDays = this.configService.get<number>('RETENTION_NOTIFICATION_DAYS', 90);
    this.auditLogRetentionDays = this.configService.get<number>('RETENTION_AUDIT_DAYS', 365);
    this.syncLogEntryRetentionDays = this.configService.get<number>('RETENTION_SYNC_LOG_DAYS', 90);
    this.loginAttemptRetentionDays = this.configService.get<number>('RETENTION_LOGIN_ATTEMPT_DAYS', 90);

    const configuredPath = this.configService.get<string>('EXPORT_STORAGE_PATH', './exports');
    this.exportStoragePath = path.resolve(configuredPath);
  }

  /**
   * Запустить все политики очистки.
   * Вызывается по cron или вручную из админ-панели.
   */
  async cleanup(): Promise<RetentionRunResult> {
    const startedAt = new Date().toISOString();
    this.logger.log('========================================');
    this.logger.log('Starting retention cleanup run...');
    this.logger.log(`  Export files > ${this.exportFileRetentionDays}d`);
    this.logger.log(`  NotificationRuns > ${this.notificationRunRetentionDays}d`);
    this.logger.log(`  AuditLogs > ${this.auditLogRetentionDays}d`);
    this.logger.log(`  SyncLogEntries > ${this.syncLogEntryRetentionDays}d`);
    this.logger.log(`  LoginAttempts > ${this.loginAttemptRetentionDays}d`);
    this.logger.log('========================================');

    const results: CleanupResult[] = [];

    // Запускаем очистку последовательно для изоляции ошибок
    results.push(await this.cleanupExportFiles());
    results.push(await this.cleanupNotificationRuns());
    results.push(await this.cleanupAuditLogs());
    results.push(await this.cleanupSyncLogEntries());
    results.push(await this.cleanupLoginAttempts());

    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
    const completedAt = new Date().toISOString();
    const startedMs = new Date(startedAt).getTime();
    const completedMs = new Date(completedAt).getTime();

    this.logger.log('========================================');
    this.logger.log(`Retention cleanup completed. Total deleted: ${totalDeleted}`);
    this.logger.log(`Duration: ${completedMs - startedMs}ms`);
    this.logger.log('========================================');

    return {
      startedAt,
      completedAt,
      duration: completedMs - startedMs,
      results,
      totalDeleted,
    };
  }

  /**
   * Получить статистику: сколько записей будет удалено без фактического удаления.
   */
  async getCleanupStats(): Promise<{
    exportFiles: number;
    notificationRuns: number;
    auditLogs: number;
    syncLogEntries: number;
    loginAttempts: number;
    total: number;
  }> {
    const now = new Date();

    const cutoffs = {
      exportFiles: new Date(now.getTime() - this.exportFileRetentionDays * 24 * 60 * 60 * 1000),
      notificationRuns: new Date(now.getTime() - this.notificationRunRetentionDays * 24 * 60 * 60 * 1000),
      auditLogs: new Date(now.getTime() - this.auditLogRetentionDays * 24 * 60 * 60 * 1000),
      syncLogEntries: new Date(now.getTime() - this.syncLogEntryRetentionDays * 24 * 60 * 60 * 1000),
      loginAttempts: new Date(now.getTime() - this.loginAttemptRetentionDays * 24 * 60 * 60 * 1000),
    };

    const [notificationRuns, auditLogs, syncLogEntries, loginAttempts] = await Promise.all([
      this.prisma.notificationRun.count({
        where: { createdAt: { lt: cutoffs.notificationRuns } },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { lt: cutoffs.auditLogs } },
      }),
      this.prisma.syncLogEntry.count({
        where: { createdAt: { lt: cutoffs.syncLogEntries } },
      }),
      this.prisma.loginAttempt.count({
        where: { attemptedAt: { lt: cutoffs.loginAttempts } },
      }),
    ]);

    // For export files, count files on disk
    const exportFiles = await this.countOldExportFiles(cutoffs.exportFiles);

    const total = notificationRuns + auditLogs + syncLogEntries + loginAttempts + exportFiles;

    return {
      exportFiles,
      notificationRuns,
      auditLogs,
      syncLogEntries,
      loginAttempts,
      total,
    };
  }

  /**
   * Очистить экспортные файлы старше RETENTION_EXPORT_DAYS.
   */
  private async cleanupExportFiles(): Promise<CleanupResult> {
    const result: CleanupResult = { entity: 'ExportFiles', deletedCount: 0 };
    const cutoff = new Date(Date.now() - this.exportFileRetentionDays * 24 * 60 * 60 * 1000);

    try {
      if (!fs.existsSync(this.exportStoragePath)) {
        this.logger.warn(`Export storage path does not exist: ${this.exportStoragePath}`);
        return result;
      }

      const files = await fs.promises.readdir(this.exportStoragePath);
      let deletedCount = 0;
      let freedBytes = 0;

      for (const file of files) {
        const filePath = path.join(this.exportStoragePath, file);
        try {
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile() && stat.mtime < cutoff) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            freedBytes += stat.size;
            this.logger.debug(`Deleted old export file: ${file}`);
          }
        } catch (fileError) {
          this.logger.warn(`Failed to process export file ${file}: ${(fileError as Error).message}`);
        }
      }

      result.deletedCount = deletedCount;
      result.freedBytes = freedBytes;
      this.logger.log(`Export cleanup: deleted ${deletedCount} files, freed ${freedBytes} bytes`);
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`Export cleanup failed: ${result.error}`, (error as Error).stack);
    }

    return result;
  }

  /**
   * Очистить старые записи NotificationRun.
   */
  private async cleanupNotificationRuns(): Promise<CleanupResult> {
    const result: CleanupResult = { entity: 'NotificationRuns', deletedCount: 0 };
    const cutoff = new Date(Date.now() - this.notificationRunRetentionDays * 24 * 60 * 60 * 1000);

    try {
      const deleteResult = await this.prisma.notificationRun.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      result.deletedCount = deleteResult.count;
      this.logger.log(`NotificationRun cleanup: deleted ${deleteResult.count} records`);
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`NotificationRun cleanup failed: ${result.error}`, (error as Error).stack);
    }

    return result;
  }

  /**
   * Очистить старые записи AuditLog.
   */
  private async cleanupAuditLogs(): Promise<CleanupResult> {
    const result: CleanupResult = { entity: 'AuditLogs', deletedCount: 0 };
    const cutoff = new Date(Date.now() - this.auditLogRetentionDays * 24 * 60 * 60 * 1000);

    try {
      const deleteResult = await this.prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      result.deletedCount = deleteResult.count;
      this.logger.log(`AuditLog cleanup: deleted ${deleteResult.count} records`);
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`AuditLog cleanup failed: ${result.error}`, (error as Error).stack);
    }

    return result;
  }

  /**
   * Очистить старые записи SyncLogEntry.
   */
  private async cleanupSyncLogEntries(): Promise<CleanupResult> {
    const result: CleanupResult = { entity: 'SyncLogEntries', deletedCount: 0 };
    const cutoff = new Date(Date.now() - this.syncLogEntryRetentionDays * 24 * 60 * 60 * 1000);

    try {
      const deleteResult = await this.prisma.syncLogEntry.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      result.deletedCount = deleteResult.count;
      this.logger.log(`SyncLogEntry cleanup: deleted ${deleteResult.count} records`);
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`SyncLogEntry cleanup failed: ${result.error}`, (error as Error).stack);
    }

    return result;
  }

  /**
   * Очистить старые записи LoginAttempt.
   */
  private async cleanupLoginAttempts(): Promise<CleanupResult> {
    const result: CleanupResult = { entity: 'LoginAttempts', deletedCount: 0 };
    const cutoff = new Date(Date.now() - this.loginAttemptRetentionDays * 24 * 60 * 60 * 1000);

    try {
      const deleteResult = await this.prisma.loginAttempt.deleteMany({
        where: { attemptedAt: { lt: cutoff } },
      });
      result.deletedCount = deleteResult.count;
      this.logger.log(`LoginAttempt cleanup: deleted ${deleteResult.count} records`);
    } catch (error) {
      result.error = (error as Error).message;
      this.logger.error(`LoginAttempt cleanup failed: ${result.error}`, (error as Error).stack);
    }

    return result;
  }

  /**
   * Подсчитать количество старых экспортных файлов (для статистики).
   */
  private async countOldExportFiles(cutoff: Date): Promise<number> {
    try {
      if (!fs.existsSync(this.exportStoragePath)) {
        return 0;
      }

      const files = await fs.promises.readdir(this.exportStoragePath);
      let count = 0;

      for (const file of files) {
        const filePath = path.join(this.exportStoragePath, file);
        try {
          const stat = await fs.promises.stat(filePath);
          if (stat.isFile() && stat.mtime < cutoff) {
            count++;
          }
        } catch {
          // skip
        }
      }

      return count;
    } catch {
      return 0;
    }
  }
}
