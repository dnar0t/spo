/**
 * PrismaClient factory — изолированный файл без NestJS-декораторов.
 * SWC не генерирует extends-код для классов из этого файла.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

export function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });
}
