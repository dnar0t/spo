/**
 * Timesheet Module (Infrastructure Layer)
 *
 * Предоставляет реализации репозиториев для модуля Timesheet.
 * Импортирует PrismaModule для доступа к БД.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaTimesheetRepository } from './repositories/prisma-timesheet.repository';

@Module({
  imports: [PrismaModule],
  providers: [PrismaTimesheetRepository],
  exports: [PrismaTimesheetRepository],
})
export class TimesheetModule {}
