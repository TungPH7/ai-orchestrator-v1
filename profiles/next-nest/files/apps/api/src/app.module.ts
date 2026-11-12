import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';

// The API of __TITLE__. The first Epic adds its modules here.
@Module({
  controllers: [HealthController],
})
export class AppModule {}
