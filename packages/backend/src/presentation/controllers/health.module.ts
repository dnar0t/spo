import { Module } from '@nestjs/common';
import { SysHealthController } from './health.controller';

@Module({
  controllers: [SysHealthController],
})
export class HealthModule {}
