/**
 * EmployeeProfile Repository Interface (Port)
 *
 * Определяет контракт для работы с профилями сотрудников.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { BaseRepository } from './base.repository';

export interface EmployeeProfileRepository extends BaseRepository<EmployeeProfile, string> {
  /** Найти профиль по ID пользователя */
  findByUserId(userId: string): Promise<EmployeeProfile | null>;

  /** Найти всех подчинённых руководителя */
  findByManagerId(managerId: string): Promise<EmployeeProfile[]>;

  /** Найти всех сотрудников по рабочей роли */
  findByWorkRoleId(workRoleId: string): Promise<EmployeeProfile[]>;

  /** Получить все активные профили */
  findAllActive(): Promise<EmployeeProfile[]>;
}
