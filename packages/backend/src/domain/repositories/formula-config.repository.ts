/**
 * FormulaConfig Repository Interface (Port)
 *
 * Определяет контракт для работы с конфигурациями формул.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { FormulaConfig } from '../entities/formula-config.entity';
import { BaseRepository } from './base.repository';

export interface FormulaConfigRepository extends BaseRepository<FormulaConfig, string> {
  /** Найти все формулы по типу (NDFL, INSURANCE, VACATION_RESERVE, OTHER) */
  findByType(formulaType: string): Promise<FormulaConfig[]>;

  /** Найти активную формулу по типу */
  findActiveByType(formulaType: string): Promise<FormulaConfig | null>;

  /** Получить все активные формулы */
  findActiveAll(): Promise<FormulaConfig[]>;
}
