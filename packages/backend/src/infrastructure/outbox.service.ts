/**
 * OutboxService
 *
 * Сервис для записи сообщений в Transactional Outbox.
 * Позволяет атомарно (в одной транзакции с бизнес-данными) сохранять
 * события для последующей асинхронной отправки.
 *
 * Используется совместно с OutboxProcessor, который читает и обрабатывает
 * эти сообщения.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}

  /**
   * Записывает сообщение в outbox.
   * Может быть вызвана как внутри Prisma-транзакции (передавая tx),
   * так и вне её (тогда используется this.prisma напрямую).
   *
   * @param event - данные события
   * @param tx - опциональный TransactionClient для участия в существующей транзакции
   */
  async write<T>(
    event: {
      aggregateType: string;
      aggregateId: string;
      eventName: string;
      payload: T;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.outboxMessage.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventName: event.eventName,
        payload: JSON.stringify(event.payload),
      },
    });
  }
}
