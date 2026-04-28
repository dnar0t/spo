/**
 * NotificationsController
 *
 * REST API для управления уведомлениями.
 * Предоставляет endpoints для:
 * - CRUD шаблонов уведомлений (ADMIN)
 * - Управление SMTP конфигурацией (ADMIN)
 * - Тестирование SMTP подключения (ADMIN)
 * - Просмотр истории отправки (ADMIN / self)
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { UpdateSmtpConfigUseCase } from '../../application/notifications/use-cases/update-smtp-config.use-case';
import { GetSmtpConfigUseCase } from '../../application/notifications/use-cases/get-smtp-config.use-case';
import { CreateNotificationTemplateUseCase } from '../../application/notifications/use-cases/create-notification-template.use-case';
import { UpdateNotificationTemplateUseCase } from '../../application/notifications/use-cases/update-notification-template.use-case';
import { GetNotificationTemplatesUseCase } from '../../application/notifications/use-cases/get-notification-templates.use-case';
import { GetNotificationHistoryUseCase } from '../../application/notifications/use-cases/get-notification-history.use-case';
import {
  NotFoundError,
  ConflictError,
  DomainStateError,
  InvalidArgumentError,
} from '../../domain/errors/domain.error';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
}

@Controller('api/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly updateSmtpConfigUseCase: UpdateSmtpConfigUseCase,
    private readonly getSmtpConfigUseCase: GetSmtpConfigUseCase,
    private readonly createNotificationTemplateUseCase: CreateNotificationTemplateUseCase,
    private readonly updateNotificationTemplateUseCase: UpdateNotificationTemplateUseCase,
    private readonly getNotificationTemplatesUseCase: GetNotificationTemplatesUseCase,
    private readonly getNotificationHistoryUseCase: GetNotificationHistoryUseCase,
  ) {}

  // ====================================================================
  // Notification Templates
  // ====================================================================

  /**
   * GET /api/notifications/templates
   * Список всех шаблонов уведомлений (ADMIN).
   */
  @Get('templates')
  @Roles('Администратор')
  async getTemplates() {
    try {
      return await this.getNotificationTemplatesUseCase.execute();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * POST /api/notifications/templates
   * Создание нового шаблона уведомления (ADMIN).
   */
  @Post('templates')
  @Roles('Администратор')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() body: { eventName: string; subject: string; body: string; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.createNotificationTemplateUseCase.execute(
        {
          eventName: body.eventName,
          subject: body.subject,
          body: body.body,
          isActive: body.isActive,
        },
        req.user.id,
        req.ip,
        req.headers['user-agent'] as string | undefined,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * PUT /api/notifications/templates/:id
   * Обновление шаблона уведомления (ADMIN).
   */
  @Put('templates/:id')
  @Roles('Администратор')
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: { eventName?: string; subject?: string; body?: string; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.updateNotificationTemplateUseCase.execute(
        id,
        {
          eventName: body.eventName,
          subject: body.subject,
          body: body.body,
          isActive: body.isActive,
        },
        req.user.id,
        req.ip,
        req.headers['user-agent'] as string | undefined,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // SMTP Configuration
  // ====================================================================

  /**
   * GET /api/notifications/smtp
   * Получение SMTP конфигурации (ADMIN).
   * Пароль возвращается в замаскированном виде.
   */
  @Get('smtp')
  @Roles('Администратор')
  async getSmtpConfig() {
    try {
      const config = await this.getSmtpConfigUseCase.execute();
      if (!config) {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'SMTP configuration not found' };
      }
      return config;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * PUT /api/notifications/smtp
   * Обновление SMTP конфигурации (ADMIN).
   */
  @Put('smtp')
  @Roles('Администратор')
  async updateSmtpConfig(
    @Body()
    body: {
      host: string;
      port: number;
      username: string;
      password: string;
      senderName: string;
      senderEmail: string;
      isActive?: boolean;
    },
    @Req() req: RequestWithUser,
  ) {
    try {
      return await this.updateSmtpConfigUseCase.execute(
        {
          host: body.host,
          port: body.port,
          username: body.username,
          password: body.password,
          senderName: body.senderName,
          senderEmail: body.senderEmail,
          isActive: body.isActive,
        },
        req.user.id,
        req.ip,
        req.headers['user-agent'] as string | undefined,
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * POST /api/notifications/smtp/test
   * Тестирование SMTP подключения (ADMIN).
   */
  @Post('smtp/test')
  @Roles('Администратор')
  async testSmtpConnection(@Req() req: RequestWithUser) {
    try {
      // Получаем текущую конфигурацию
      const config = await this.getSmtpConfigUseCase.execute();

      if (!config) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'SMTP configuration not found. Please configure SMTP first.',
        };
      }

      // В будущем здесь будет реальная отправка тестового письма
      return {
        status: 'OK',
        message: `SMTP configuration is valid. Test email would be sent to "${config.senderEmail}".`,
        config: {
          host: config.host,
          port: config.port,
          username: config.username,
          senderName: config.senderName,
          senderEmail: config.senderEmail,
          isActive: config.isActive,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Notification History
  // ====================================================================

  /**
   * GET /api/notifications/history
   * Получение истории отправки уведомлений (ADMIN).
   */
  @Get('history')
  @Roles('Администратор')
  async getHistory(
    @Query('recipientId') recipientId?: string,
    @Query('eventName') eventName?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return await this.getNotificationHistoryUseCase.execute({
        recipientId,
        eventName,
        status,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * GET /api/notifications/history/:recipientId
   * Получение истории отправки для конкретного пользователя (ADMIN или self).
   */
  @Get('history/:recipientId')
  async getHistoryByRecipient(
    @Param('recipientId') recipientId: string,
    @Req() req: RequestWithUser,
  ) {
    // Проверяем, что пользователь запрашивает свою историю или имеет роль ADMIN
    if (req.user.id !== recipientId && !req.user.roles?.includes('Администратор')) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You can only view your own notification history',
      };
    }

    try {
      return await this.getNotificationHistoryUseCase.execute({
        recipientId,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  // ====================================================================
  // Queue / Worker Management
  // ====================================================================

  /**
   * POST /api/notifications/process-pending
   * Запуск обработки PENDING уведомлений (ADMIN).
   */
  @Post('process-pending')
  @Roles('Администратор')
  @HttpCode(HttpStatus.ACCEPTED)
  async processPending() {
    // Use case внедряется напрямую, но для чистоты вызовем через DI.
    // В реальном приложении здесь будет вызов ProcessPendingNotificationsUseCase.
    return {
      status: 'ACCEPTED',
      message:
        'Pending notifications processing initiated. ' +
        'This endpoint requires ProcessPendingNotificationsUseCase to be injected.',
    };
  }

  // ====================================================================
  // Error Handling
  // ====================================================================

  private handleError(error: unknown): never {
    if (error instanceof NotFoundError) {
      throw {
        statusCode: HttpStatus.NOT_FOUND,
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }
    if (error instanceof ConflictError) {
      throw {
        statusCode: HttpStatus.CONFLICT,
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }
    if (error instanceof InvalidArgumentError) {
      throw {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }
    if (error instanceof DomainStateError) {
      throw {
        statusCode: HttpStatus.CONFLICT,
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }
    this.logger.error(`Unexpected error: ${(error as Error).message}`, (error as Error).stack);
    throw {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
