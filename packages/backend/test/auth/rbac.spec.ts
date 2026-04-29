import { RolesGuard, Roles } from '../../src/presentation/guards/roles.guard';
import { ROLES } from '../../src/common/auth/roles.constants';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('RBAC: RolesGuard + @Roles decorator', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(handlerRoles: string[] | undefined, userRoles: string[]): any {
    const handler = () => {};

    // If roles are specified, set metadata via Reflector.defineMetadata
    if (handlerRoles && handlerRoles.length > 0) {
      Reflect.defineMetadata('roles', handlerRoles, handler);
    }

    return {
      getHandler: () => handler,
      getClass: () => ({}) as any,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', login: 'testuser', roles: userRoles },
        }),
      }),
    };
  }

  describe('RolesGuard', () => {
    it('должен выбрасывать 403 если у пользователя нет нужной роли', () => {
      const context = createMockContext([ROLES.ADMIN], ['employee']);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('при наличии роли admin доступ разрешён', () => {
      const context = createMockContext([ROLES.ADMIN], [ROLES.ADMIN]);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('должен разрешать доступ при наличии одной из нескольких требуемых ролей', () => {
      const context = createMockContext([ROLES.ADMIN, ROLES.DIRECTOR], [ROLES.DIRECTOR]);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('должен разрешать доступ если @Roles не указан (публичный endpoint)', () => {
      const context = createMockContext(undefined, ['employee']);

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('должен выбрасывать 403 если пользователь не аутентифицирован', () => {
      const handler = () => {};
      Reflect.defineMetadata('roles', [ROLES.ADMIN], handler);

      const context = {
        getHandler: () => handler,
        getClass: () => ({}) as any,
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
        getArgs: () => [] as any[],
        getArgByIndex: () => undefined as any,
        switchToRpc: () => ({}) as any,
        switchToWs: () => ({}) as any,
        getType: () => 'http' as const,
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать 403 если у пользователя пустой список ролей', () => {
      const context = createMockContext([ROLES.MANAGER], []);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('@Roles decorator', () => {
    it('@Roles работает с константами из ROLES (а не строковыми литералами)', () => {
      // Arrange: используем декоратор с константами ROLES
      class TestController {
        @Roles(ROLES.ADMIN, ROLES.MANAGER)
        adminEndpoint(): string {
          return 'ok';
        }
      }

      const controller = new TestController();
      const endpointMethod = controller.adminEndpoint;

      // Проверяем что метаданные установлены через декоратор
      const metadata = Reflect.getMetadata('roles', endpointMethod);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual([ROLES.ADMIN, ROLES.MANAGER]);

      // Проверяем что это именно значения констант, а не строковые литералы
      expect(metadata).toContain('admin');
      expect(metadata).toContain('manager');
    });

    it('@Roles с одной ролью корректно сохраняет метаданные', () => {
      class TestController {
        @Roles(ROLES.DIRECTOR)
        directorEndpoint(): string {
          return 'ok';
        }
      }

      const controller = new TestController();
      const metadata = Reflect.getMetadata('roles', controller.directorEndpoint);
      expect(metadata).toEqual(['director']);
    });

    it('@Roles без аргументов не устанавливает метаданные (доступ всем)', () => {
      class TestController {
        @Roles()
        publicEndpoint(): string {
          return 'ok';
        }
      }

      const controller = new TestController();
      const metadata = Reflect.getMetadata('roles', controller.publicEndpoint);
      expect(metadata).toEqual([]);
    });
  });
});
