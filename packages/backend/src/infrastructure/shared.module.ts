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
 */
import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class SharedModule {}
