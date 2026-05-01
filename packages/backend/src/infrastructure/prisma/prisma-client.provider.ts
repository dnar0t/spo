/**
 * PrismaClientProvider
 *
 * Отдельный файл для фабрики PrismaClient.
 * SWC некорректно обрабатывает require('@prisma/client') в файлах,
 * содержащих классы с NestJS-декораторами (@Injectable и т.д.),
 * генерируя для них extends-код.
 *
 * Этот файл не содержит декорированных классов, поэтому SWC
 * обрабатывает require корректно.
 */
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

export const PrismaClientProvider = {
  provide: PRISMA_CLIENT,
  useFactory: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');
    return new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });
  },
};
