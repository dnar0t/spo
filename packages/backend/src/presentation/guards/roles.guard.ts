import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Декоратор @Roles('Директор', 'Менеджер', ...)
 * Указывает, какие роли имеют доступ к endpoint'у.
 *
 * Использование:
 * ```typescript
 * @Roles('ADMIN', 'DIRECTOR')
 * @Get('some-protected-route')
 * endpoint() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * RolesGuard
 *
 * NestJS Guard, который проверяет наличие одной из указанных ролей
 * у текущего пользователя (из JWT payload в request.user).
 *
 * Использует metadata из декоратора @Roles().
 *
 * Если декоратор @Roles() не указан на endpoint'е — доступ разрешён всем
 * аутентифицированным пользователям.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если роли не указаны — доступ разрешён всем аутентифицированным
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('RolesGuard: user not found in request (JwtAuthGuard must run first)');
      throw new ForbiddenException('Access denied: user not authenticated');
    }

    // user.id / user.login / user.sessionId — из JwtAuthGuard
    // user.roles — загружаются из БД (можно расширить в будущем)
    // Пока что roles загружаются через отдельный запрос к UserRepository
    // В этом guard мы проверяем только те роли, что уже добавлены в request.user

    const userRoles: string[] = user.roles ?? [];

    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied for user "${user.login ?? user.id}": required roles [${requiredRoles.join(', ')}], ` +
        `user has [${userRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Access denied: requires one of roles [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
