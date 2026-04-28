/**
 * Finance Module (Infrastructure Layer)
 *
 * Предоставляет реализации репозиториев для модуля Finance.
 * Импортирует PrismaModule для доступа к БД.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [],
  exports: [],
})
export class FinanceModule {}
