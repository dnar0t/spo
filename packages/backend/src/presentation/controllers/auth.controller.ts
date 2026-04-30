import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { LoginUseCase } from '../../application/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/auth/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/auth/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/auth/use-cases/get-current-user.use-case';
import { LoginDto } from '../../application/auth/dto/login.dto';
import { RefreshTokenDto } from '../../application/auth/dto/refresh-token.dto';
import { AuthResponseDto } from '../../application/auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { ROLES } from '../../application/auth/constants';
import {
  ILdapAuthAdapter,
  LDAP_AUTH_ADAPTER,
} from '../../application/auth/ports/ldap-auth.adapter';

/**
 * AuthController
 *
 * REST API контроллер для аутентификации и управления сессиями.
 *
 * Endpoints:
 * - POST /api/auth/login       — вход пользователя (public, rate-limited)
 * - POST /api/auth/refresh     — ротация refresh token (public)
 * - POST /api/auth/logout      — выход (требует JWT)
 * - GET  /api/auth/me          — текущий пользователь (требует JWT)
 * - POST /api/auth/test-ldap   — тест LDAP (требует ADMIN)
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    @Inject(LDAP_AUTH_ADAPTER) private readonly ldapAuthAdapter: ILdapAuthAdapter,
  ) {}

  /**
   * POST /api/auth/login
   *
   * Аутентификация пользователя по логину и паролю.
   * Возвращает access token, refresh token и профиль пользователя.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: Record<string, any>, @Req() req: Request): Promise<AuthResponseDto> {
    const dto: LoginDto = body as unknown as LoginDto;
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    this.logger.debug(`Login attempt for user "${dto.login}" from IP ${ipAddress}`);

    return this.loginUseCase.execute(dto, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * POST /api/auth/refresh
   *
   * Ротация refresh token. Принимает старый refresh token,
   * отзывает его и создаёт новый, возвращая также новый access token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.refreshTokenUseCase.execute(dto, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * POST /api/auth/logout
   *
   * Выход пользователя из системы. Отзывает все refresh сессии
   * текущего пользователя.
   *
   * Требует JWT access token в заголовке Authorization.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request): Promise<{ success: boolean }> {
    const user = (req as any).user;
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    this.logger.debug(`Logout for user "${user.id}"`);

    return this.logoutUseCase.execute(user.id, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * GET /api/auth/me
   *
   * Возвращает профиль текущего аутентифицированного пользователя.
   *
   * Требует JWT access token в заголовке Authorization.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: Request) {
    const user = (req as any).user;

    this.logger.debug(`Get current user: "${user.id}"`);

    return this.getCurrentUserUseCase.execute(user.id);
  }

  /**
   * POST /api/auth/test-ldap
   *
   * Тестирование подключения к LDAP серверу.
   * Требует роль ADMIN.
   *
   * Возвращает статус подключения и информацию о конфигурации.
   */
  @Post('test-ldap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testLdap(@Req() req: Request) {
    const user = (req as any).user;

    this.logger.debug(`LDAP test requested by user "${user.id}"`);

    const isConfigured = this.ldapAuthAdapter.isConfigured();

    // Attempt a test authentication with a dummy user to check connectivity
    // In real scenarios, this would bind to LDAP anonymously or with a service account
    let connectionStatus: string;
    try {
      const result = await this.ldapAuthAdapter.authenticate('test-connection', 'test-password');
      connectionStatus = result.success ? 'connected' : 'authentication_failed';
    } catch (error) {
      connectionStatus = `error: ${(error as Error).message}`;
    }

    return {
      isConfigured,
      connectionStatus,
      mockMode: !process.env.LDAP_HOST,
    };
  }
}
