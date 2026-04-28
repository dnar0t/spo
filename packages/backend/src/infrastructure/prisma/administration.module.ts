/**
 * Administration Module (Infrastructure)
 *
 * Предоставляет реализации репозиториев для модуля администрирования.
 * Импортирует PrismaModule для доступа к БД.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { PrismaEmployeeProfileRepository } from './repositories/prisma-employee-profile.repository';
import { PrismaEmployeeRateRepository } from './repositories/prisma-employee-rate.repository';
import { PrismaFormulaConfigRepository } from './repositories/prisma-formula-config.repository';
import { PrismaEvaluationScaleRepository } from './repositories/prisma-evaluation-scale.repository';
import { PrismaWorkRoleRepository } from './repositories/prisma-work-role.repository';
import { PrismaPlanningSettingsRepository } from './repositories/prisma-planning-settings.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaEmployeeProfileRepository,
    PrismaEmployeeRateRepository,
    PrismaFormulaConfigRepository,
    PrismaEvaluationScaleRepository,
    PrismaWorkRoleRepository,
    PrismaPlanningSettingsRepository,
  ],
  exports: [
    PrismaEmployeeProfileRepository,
    PrismaEmployeeRateRepository,
    PrismaFormulaConfigRepository,
    PrismaEvaluationScaleRepository,
    PrismaWorkRoleRepository,
    PrismaPlanningSettingsRepository,
  ],
})
export class AdministrationModule {}
