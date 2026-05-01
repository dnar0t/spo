/**
 * SharedModule
 *
 * Глобальный модуль, предоставляющий общие сервисы для всего приложения.
 * Зарегистрирован в AppModule с @Global(), поэтому все провайдеры из этого
 * модуля доступны для инъекции во все остальные модули без явного импорта.
 *
 * Содержит:
 * - EventBusService — простая шина событий (in-process pub/sub) для
 *   межмодульного взаимодействия (например, реакция на PlanFixedEvent
 *   в модуле интеграции).
 * - OutboxService — сервис для записи сообщений в Transactional Outbox
 *   в рамках одной транзакции с бизнес-данными.
 * - OutboxProcessor — worker, периодически обрабатывающий неотправленные
 *   сообщения из outbox и публикующий их через EventBus.
 */
import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { OutboxService } from './outbox.service';
import { OutboxProcessor } from './outbox.processor';
import { createPrismaClient } from './prisma/prisma-factory';

@Global()
@Module({
  providers: [
    EventBusService,
    OutboxService,
    OutboxProcessor,
    {
      provide: 'PRISMA_CLIENT',
      useFactory: () => createPrismaClient(),
    },
  ],
  exports: [EventBusService, OutboxService, 'PRISMA_CLIENT'],
})
export class SharedModule {}
