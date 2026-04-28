/**
 * PlanningSettings Repository Interface (Port)
 *
 * Определяет контракт для работы с настройками планирования.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { PlanningSettings } from '../entities/planning-settings.entity';
import { BaseRepository } from './base.repository';

export interface PlanningSettingsRepository extends BaseRepository<PlanningSettings, string> {
  /** Получить последнюю (текущую) версию настроек */
  findLatest(): Promise<PlanningSettings | null>;
}
