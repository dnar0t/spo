import { Controller, Get, HttpException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }

  @Get('ready')
  async ready() {
    const start = Date.now();
    let dbStatus: 'up' | 'down' = 'up';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'down';
    }

    const latencyMs = Date.now() - start;

    const body = {
      status: dbStatus === 'up' ? 'ok' : 'down',
      timestamp: Date.now(),
      checks: {
        database: { status: dbStatus, latencyMs },
      },
    };

    if (dbStatus === 'down') {
      throw new HttpException(body, 503);
    }

    return body;
  }
}
