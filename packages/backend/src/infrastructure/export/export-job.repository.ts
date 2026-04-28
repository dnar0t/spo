/**
 * ExportJobRepository Implementation (Infrastructure Layer)
 *
 * Реализация репозитория ExportJob с хранением в памяти и персистентностью
 * в JSON-файл. Не требует миграций базы данных или дополнительных моделей Prisma.
 *
 * Thread-safe для однопоточного приложения (NestJS single-threaded event loop).
 * Данные сохраняются в `data/exports/export-jobs.json` для сохранения между перезапусками.
 */
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ExportJobRepository } from '../../domain/repositories/export-job.repository';
import { ExportJob, ExportJobPersistenceData } from '../../domain/entities/export-job.entity';

@Injectable()
export class JsonExportJobRepository implements ExportJobRepository {
  private readonly logger = new Logger(JsonExportJobRepository.name);
  private readonly storagePath: string;
  private jobs: Map<string, ExportJob> = new Map();
  private loaded = false;

  constructor() {
    const dataDir = path.resolve(process.env.EXPORT_DATA_DIR || './data/exports');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storagePath = path.join(dataDir, 'export-jobs.json');
    this.loadFromDisk();
  }

  // ─── Private helpers ───

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const data: ExportJobPersistenceData[] = JSON.parse(raw);
        for (const item of data) {
          const job = ExportJob.fromPersistence(item);
          this.jobs.set(job.id, job);
        }
        this.logger.log(`Loaded ${this.jobs.size} export jobs from disk`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to load export jobs from disk: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
    this.loaded = true;
  }

  private saveToDisk(): void {
    try {
      const data: ExportJobPersistenceData[] = [];
      for (const job of this.jobs.values()) {
        data.push(job.toPersistence());
      }
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(
        `Failed to save export jobs to disk: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ─── BaseRepository Implementation ───

  async findById(id: string): Promise<ExportJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async findAll(): Promise<ExportJob[]> {
    return Array.from(this.jobs.values());
  }

  async save(entity: ExportJob): Promise<ExportJob> {
    this.jobs.set(entity.id, entity);
    this.saveToDisk();
    return entity;
  }

  async update(entity: ExportJob): Promise<ExportJob> {
    if (!this.jobs.has(entity.id)) {
      throw new Error(`ExportJob with id "${entity.id}" not found for update`);
    }
    this.jobs.set(entity.id, entity);
    this.saveToDisk();
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
    this.saveToDisk();
  }

  // ─── ExportJobRepository Specific Methods ───

  async findByUserId(userId: string): Promise<ExportJob[]> {
    return Array.from(this.jobs.values()).filter((job) => job.userId === userId);
  }

  async findByStatus(status: string): Promise<ExportJob[]> {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  async findPending(): Promise<ExportJob[]> {
    return this.findByStatus('PENDING');
  }

  async findExpired(): Promise<ExportJob[]> {
    const now = new Date();
    return Array.from(this.jobs.values()).filter(
      (job) => job.status === 'COMPLETED' && job.isExpired(),
    );
  }
}
