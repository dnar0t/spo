/**
 * WorkRole Repository Interface (Port)
 *
 * Определяет контракт для работы с рабочими ролями.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { WorkRole } from '../entities/work-role.entity';
import { BaseRepository } from './base.repository';

export interface WorkRoleRepository extends BaseRepository<WorkRole, string> {
  /** Найти рабочую роль по имени */
  findByName(name: string): Promise<WorkRole | null>;
}
