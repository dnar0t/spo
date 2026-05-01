/**
 * PrismaClientProvider
 *
 * Отдельный файл для фабрики PrismaClient.
 * Этот файл не содержит NestJS-декорированных классов (@Injectable),
 * поэтому SWC обрабатывает require('@prisma/client') корректно.
 */
import { PrismaClient } from '@prisma/client';

export const PrismaClientProvider = {
  provide: 'PRISMA_CLIENT',
  useFactory: () => {
    return new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  },
};
