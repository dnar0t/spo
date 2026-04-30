/**
 * PrismaClientFactory
 *
 * Фабрика для создания PrismaClient.
 * Вынесена в отдельный файл, чтобы избежать бага SWC,
 * который генерирует extends-код при импорте из @prisma/client.
 */
export function createPrismaClient(options: any): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient(options);
}
