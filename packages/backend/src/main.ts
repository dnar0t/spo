import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './presentation/filters/global-exception.filter';
import { ResponseWrapperInterceptor } from './presentation/interceptors/response-wrapper.interceptor';
import { RequestLoggingInterceptor } from './presentation/interceptors/request-logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor(), new ResponseWrapperInterceptor());

  const configService = app.get(ConfigService);
  const corsOrigins = configService.get('CORS_ORIGINS', 'http://localhost:5173').split(',');
  app.enableCors({ origin: corsOrigins, credentials: true });

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log('Application is running on: http://localhost:' + port + '/api');
}

bootstrap();
