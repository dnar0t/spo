/**
 * EmployeeRate Repository Interface (Port)
 *
 * Определяет контракт для работы со ставками сотрудников.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { EmployeeRate } from '../entities/employee-rate.entity';
import { BaseRepository } from './base.repository';

export interface EmployeeRateRepository extends BaseRepository<EmployeeRate, string> {
  /** Найти все ставки пользователя */
  findByUserId(userId: string): Promise<EmployeeRate[]>;

  /** Найти эффективную (текущую) ставку на указанную дату */
  findEffectiveByUserId(userId: string, date: Date): Promise<EmployeeRate | null>;

  /** Получить историю ставок пользователя */
  findHistoryByUserId(userId: string): Promise<EmployeeRate[]>;

  /** Получить все текущие (активные) ставки */
  findCurrentEffective(): Promise<EmployeeRate[]>;
}
