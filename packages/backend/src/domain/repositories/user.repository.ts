/**
 * User Repository Interface (Port)
 *
 * Определяет контракт для работы с пользователями в domain layer.
 * Реализация находится в infrastructure слое (Prisma).
 */
import { User } from '../entities/user.entity';
import { BaseRepository } from './base.repository';

export interface UserRepository extends BaseRepository<User, string> {
  /** Найти пользователя по логину */
  findByLogin(login: string): Promise<User | null>;

  /** Найти пользователя по email */
  findByEmail(email: string): Promise<User | null>;

  /** Найти пользователя по YouTrack ID */
  findByYouTrackUserId(youtrackUserId: string): Promise<User | null>;

  /** Найти пользователя по AD логину */
  findByAdLogin(adLogin: string): Promise<User | null>;

  /** Получить всех активных пользователей */
  findAllActive(): Promise<User[]>;

  /** Получить пользователей по роли */
  findByRole(roleName: string): Promise<User[]>;

  /** Получить подчинённых руководителя */
  findSubordinatesByManagerId(managerId: string): Promise<User[]>;
}
