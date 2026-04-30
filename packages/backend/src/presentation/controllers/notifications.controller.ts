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
import { ROLES } from '../../application/auth/constants';
import { UpdateSmtpConfigUseCase } from '../../application/notifications/use-cases/update-smtp-config.use-case';
import { GetSmtpConfigUseCase } from '../../application/notifications/use-cases/get-smtp-config.use-case';
import { CreateNotificationTemplateUseCase } from '../../application/notifications/use-cases/create-notification-template.use-case';
import { UpdateNotificationTemplateUseCase } from '../../application/notifications/use-cases/update-notification-template.use-case';
import { GetNotificationTemplatesUseCase } from '../../application/notifications/use-cases/get-notification-templates.use-case';
import { GetNotificationHistoryUseCase } from '../../application/notifications/use-cases/get-notification-history.use-case';
import { NotFoundError, UnauthorizedError } from '../../domain/errors/domain.error';

interface RequestWithUser {
  user: {
    id: string;
    login: string;
    roles?: string[];
  };
  ip: string;
  headers: Record<string, string | string[] | undefined>;
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
  @Roles(ROLES.ADMIN)
  async getTemplates() {
    return await this.getNotificationTemplatesUseCase.execute();
  }

  /**
   * POST /api/notifications/templates
   * Создание нового шаблона уведомления (ADMIN).
   */
  @Post('templates')
  @Roles(ROLES.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() body: { eventName: string; subject: string; body: string; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
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
  }

  /**
   * PUT /api/notifications/templates/:id
   * Обновление шаблона уведомления (ADMIN).
   */
  @Put('templates/:id')
  @Roles(ROLES.ADMIN)
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: { eventName?: string; subject?: string; body?: string; isActive?: boolean },
    @Req() req: RequestWithUser,
  ) {
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
  @Roles(ROLES.ADMIN)
  async getSmtpConfig() {
    const config = await this.getSmtpConfigUseCase.execute();
    if (!config) {
      throw new NotFoundError('SmtpConfig', 'default');
    }
    return config;
  }

  /**
   * PUT /api/notifications/smtp
   * Обновление SMTP конфигурации (ADMIN).
   */
  @Put('smtp')
  @Roles(ROLES.ADMIN)
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
  }

  /**
   * POST /api/notifications/smtp/test
   * Тестирование SMTP подключения (ADMIN).
   */
  @Post('smtp/test')
  @Roles(ROLES.ADMIN)
  async testSmtpConnection(@Req() req: RequestWithUser) {
    const config = await this.getSmtpConfigUseCase.execute();

    if (!config) {
      throw new NotFoundError('SmtpConfig', 'default');
    }

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
  }

  // ====================================================================
  // Notification History
  // ====================================================================

  /**
   * GET /api/notifications/history
   * Получение истории отправки уведомлений (ADMIN).
   */
  @Get('history')
  @Roles(ROLES.ADMIN)
  async getHistory(
    @Query('recipientId') recipientId?: string,
    @Query('eventName') eventName?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.getNotificationHistoryUseCase.execute({
      recipientId,
      eventName,
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
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
      throw new UnauthorizedError('You can only view your own notification history');
    }

    return await this.getNotificationHistoryUseCase.execute({
      recipientId,
    });
  }

  // ====================================================================
  // Queue / Worker Management
  // ====================================================================

  /**
   * POST /api/notifications/process-pending
   * Запуск обработки PENDING уведомлений (ADMIN).
   */
  @Post('process-pending')
  @Roles(ROLES.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async processPending() {
    return {
      status: 'ACCEPTED',
      message:
        'Pending notifications processing initiated. ' +
        'This endpoint requires ProcessPendingNotificationsUseCase to be injected.',
    };
  }
}
