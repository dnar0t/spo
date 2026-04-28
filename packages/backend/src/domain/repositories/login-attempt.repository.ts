import { LoginAttempt } from '../entities/login-attempt.entity';
import { BaseRepository } from './base.repository';

export interface LoginAttemptRepository extends BaseRepository<LoginAttempt, string> {
  /** Найти последние попытки по логину за указанное количество минут */
  findRecentByLogin(login: string, withinMinutes: number): Promise<LoginAttempt[]>;

  /** Найти последние попытки по IP за указанное количество минут */
  findRecentByIp(ip: string, withinMinutes: number): Promise<LoginAttempt[]>;

  /** Подсчитать количество неудачных попыток по логину за указанное количество минут */
  countRecentFailedByLogin(login: string, withinMinutes: number): Promise<number>;

  /** Подсчитать количество неудачных попыток по IP за указанное количество минут */
  countRecentFailedByIp(ip: string, withinMinutes: number): Promise<number>;

  /** Удалить записи старше указанной даты (возвращает количество удалённых) */
  deleteOlderThan(date: Date): Promise<number>;
}
