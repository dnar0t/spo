import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '../../infrastructure/auth/jwt.service';

/**
 * JwtAuthGuard
 *
 * NestJS Guard, который проверяет наличие и валидность JWT в заголовке
 * Authorization: Bearer <token>.
 *
 * После верификации токена извлекает payload (sub, login, sessionId)
 * и сохраняет его в request.user для использования в контроллерах.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    try {
      const payload = this.jwtService.verifyAccessToken(token);

      // Attach user payload to request for use in controllers
      request.user = {
        id: payload.sub,
        login: payload.login,
        sessionId: payload.sessionId,
      };

      return true;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Извлечение Bearer токена из заголовка Authorization.
   * Ожидается формат: "Bearer <token>"
   */
  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
