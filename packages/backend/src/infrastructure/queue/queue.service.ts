/**
 * QueueService
 *
 * Простая очередь задач в памяти для обработки PENDING уведомлений.
 * В production может быть заменена на Redis/Bull.
 *
 * - processNext(): обрабатывает следующую задачу из очереди
 * - getQueueStats(): возвращает статистику очереди
 */
import { Injectable, Logger } from '@nestjs/common';

export interface QueueTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queue: QueueTask[] = [];
  private isProcessing = false;
  private processedCount = 0;
  private failedCount = 0;

  /**
   * Добавить задачу в очередь.
   */
  enqueue(task: Omit<QueueTask, 'createdAt'>): void {
    this.queue.push({
      ...task,
      createdAt: new Date(),
    });
    this.logger.log(`Task "${task.id}" of type "${task.type}" enqueued. Queue size: ${this.queue.length}`);
  }

  /**
   * Получить следующую задачу из очереди (без удаления).
   */
  peek(): QueueTask | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Извлечь и вернуть следующую задачу из очереди.
   */
  dequeue(): QueueTask | null {
    return this.queue.shift() ?? null;
  }

  /**
   * Получить размер очереди.
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Очистить очередь.
   */
  clear(): void {
    this.queue.length = 0;
    this.logger.log('Queue cleared');
  }

  /**
   * Отметить успешную обработку задачи.
   */
  markProcessed(): void {
    this.processedCount++;
  }

  /**
   * Отметить неудачную обработку задачи.
   */
  markFailed(): void {
    this.failedCount++;
  }

  /**
   * Получить статистику очереди.
   */
  getQueueStats(): {
    size: number;
    isProcessing: boolean;
    processedCount: number;
    failedCount: number;
  } {
    return {
      size: this.queue.length,
      isProcessing: this.isProcessing,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };
  }

  /**
   * Установить флаг обработки.
   */
  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }
}
