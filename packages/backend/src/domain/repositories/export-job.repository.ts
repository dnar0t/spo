/**
 * ExportJobRepository Interface (Domain Layer)
 *
 * Порт для хранения задач на экспорт.
 * Определяет контракт для доступа к данным ExportJob.
 */
import { BaseRepository } from './base.repository';
import { ExportJob } from '../entities/export-job.entity';

export const EXPORT_JOB_REPOSITORY = Symbol('EXPORT_JOB_REPOSITORY');

export interface ExportJobRepository extends BaseRepository<ExportJob, string> {
  /** Найти все задачи пользователя */
  findByUserId(userId: string): Promise<ExportJob[]>;

  /** Найти все задачи по статусу */
  findByStatus(status: string): Promise<ExportJob[]>;

  /** Найти все ожидающие обработки задачи */
  findPending(): Promise<ExportJob[]>;

  /** Найти все задачи с истекшим сроком хранения */
  findExpired(): Promise<ExportJob[]>;
}
