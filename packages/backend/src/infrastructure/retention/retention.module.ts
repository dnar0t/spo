import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RetentionService } from './retention.service';

/**
 * RetentionModule
 *
 * Модуль для управления политиками хранения данных (retention policies).
 * Предоставляет RetentionService для очистки устаревших записей:
 *   - экспортные файлы
 *   - уведомления (NotificationRun)
 *   - журнал аудита (AuditLog)
 *   - логи синхронизации (SyncLogEntry)
 *   - попытки входа (LoginAttempt)
 *
 * Импортируется в AppModule и может быть использован в admin-контроллере.
 */
@Module({
  imports: [PrismaModule],
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
