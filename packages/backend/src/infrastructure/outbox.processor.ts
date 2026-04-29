/**
 * OutboxProcessor
 *
 * Worker, который периодически (каждые 5 секунд) выбирает необработанные
 * сообщения из outbox, публикует их через EventBus и отмечает как обработанные.
 * При ошибке инкрементирует retryCount и логирует ошибку.
 * После превышения maxRetries (3) помечает сообщение как failed.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { EventBusService } from './event-bus.service';
import { BaseEvent } from '../domain/events/base.event';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessor.name);
  private readonly maxRetries = 3;
  private readonly pollIntervalMs = 5000;
  private readonly batchSize = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async onModuleInit() {
    this.startPolling();
  }

  private startPolling() {
    this.logger.log(
      `OutboxProcessor started. Polling every ${this.pollIntervalMs}ms, batch size: ${this.batchSize}, max retries: ${this.maxRetries}`,
    );
    setInterval(() => this.process(), this.pollIntervalMs);
  }

  private async process(): Promise<void> {
    try {
      const messages = await this.prisma.outboxMessage.findMany({
        where: {
          processedAt: null,
          OR: [{ retryCount: { lt: this.maxRetries } }, { failedAt: null }],
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
      });

      if (messages.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${messages.length} outbox message(s)`);

      for (const msg of messages) {
        await this.handleMessage(msg);
      }
    } catch (error) {
      this.logger.error(
        `Outbox processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async handleMessage(msg: {
    id: string;
    type: string;
    aggregateType: string;
    aggregateId: string;
    payload: string;
    retryCount: number;
  }): Promise<void> {
    try {
      const payload = JSON.parse(msg.payload);

      const event = new (class extends BaseEvent {
        constructor() {
          super();
        }
      })();

      // Используем defineProperty для установки eventName (т.к. он readonly)
      Object.defineProperty(event, 'eventName', {
        value: msg.type,
        writable: false,
      });

      // Копируем все поля из payload в event
      Object.assign(event, payload);

      await this.eventBus.publish(event);

      await this.prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { processedAt: new Date() },
      });

      this.logger.debug(`Message ${msg.id} (${msg.type}) processed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process outbox message ${msg.id} (${msg.type}): ${errorMessage}`,
      );

      await this.prisma.outboxMessage.update({
        where: { id: msg.id },
        data: {
          retryCount: { increment: 1 },
          error: errorMessage,
          failedAt: msg.retryCount >= this.maxRetries - 1 ? new Date() : undefined,
        },
      });
    }
  }
}
