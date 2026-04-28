/**
 * FileStorageService
 *
 * Реализация IFileStorage для локальной файловой системы.
 * Сохраняет файлы в директории exports/ с уникальными именами.
 * Поддерживает базовые операции: save, get, delete, getPublicUrl.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { IFileStorage } from '../../application/export/ports/file-storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileStorageService implements IFileStorage {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly storagePath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const configuredPath = this.configService.get<string>('EXPORT_STORAGE_PATH', './exports');
    this.storagePath = path.resolve(configuredPath);
    this.baseUrl = this.configService.get<string>('EXPORT_BASE_URL', '/api/export/download');
    this.ensureDirectoryExists();
  }

  /**
   * Гарантирует существование директории для хранения файлов.
   */
  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        this.logger.log(`Created export storage directory: ${this.storagePath}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create export storage directory: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Сохранить файл. Возвращает путь относительно корня хранилища.
   * Имя файла декорируется временной меткой для уникальности.
   */
  async save(filename: string, buffer: Buffer): Promise<string> {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const uniqueName = `${timestamp}-${randomSuffix}-${filename}`;
    const fullPath = path.join(this.storagePath, uniqueName);

    try {
      await fs.promises.writeFile(fullPath, buffer);
      this.logger.log(`Saved export file: ${fullPath} (${buffer.length} bytes)`);
      return uniqueName;
    } catch (error) {
      this.logger.error(`Failed to save export file: ${(error as Error).message}`);
      throw new Error(`Failed to save export file: ${(error as Error).message}`);
    }
  }

  /**
   * Получить файл по относительному пути.
   */
  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.storagePath, filePath);

    try {
      // Security: prevent directory traversal
      if (!fullPath.startsWith(this.storagePath)) {
        throw new Error('Invalid file path: directory traversal detected');
      }

      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      return await fs.promises.readFile(fullPath);
    } catch (error) {
      this.logger.error(`Failed to read export file: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Удалить файл по относительному пути.
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.storagePath, filePath);

    try {
      // Security: prevent directory traversal
      if (!fullPath.startsWith(this.storagePath)) {
        throw new Error('Invalid file path: directory traversal detected');
      }

      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`File to delete not found: ${fullPath}`);
        return;
      }

      await fs.promises.unlink(fullPath);
      this.logger.log(`Deleted export file: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete export file: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Получить публичный URL для скачивания файла.
   * URL строится на основе параметров реквеста для возможности скачивания.
   */
  getPublicUrl(filePath: string): string {
    return `${this.baseUrl}/${path.basename(filePath)}?path=${encodeURIComponent(filePath)}`;
  }
}
