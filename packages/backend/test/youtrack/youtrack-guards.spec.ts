import { RolesGuard, Roles } from '../../src/presentation/guards/roles.guard';
import { ROLES } from '../../src/application/auth/constants';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { YouTrackController } from '../../src/presentation/controllers/youtrack.controller';

/**
 * Модульные тесты RolesGuard на маршрутах YouTrackController.
 *
 * Проверяем, что:
 *   - неавторизованный запрос (user = null) → ForbiddenException
 *   - admin проходит на все endpoint'ы
 *   - employee получает 403 на endpoint'ы, требующие admin/director/manager
 *   - viewer проходит на read-only endpoint'ы, но not на sync / test-connection
 *
 * Подход: тестируем RolesGuard напрямую через Reflect.defineMetadata и mocked ExecutionContext.
 * Аналогично packages/backend/test/auth/rbac.spec.ts.
 */
describe('YouTrackController — Guards (JwtAuthGuard + RolesGuard)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  /**
   * Создаёт mocked ExecutionContext для указанного endpoint'а.
   *
   * @param allowedRoles - роли из декоратора @Roles() на endpoint'е
   * @param userRoles    - роли пользователя (request.user.roles)
   * @param authenticated - флаг аутентификации; если false → request.user === null
   */
  function createContextForEndpoint(
    allowedRoles: string[],
    userRoles: string[],
    authenticated = true,
  ) {
    const handler = () => {};
    Reflect.defineMetadata('roles', allowedRoles, handler);

    return {
      getHandler: () => handler,
      getClass: () => ({}) as any,
      switchToHttp: () => ({
        getRequest: () => ({
          user: authenticated ? { id: 'user-1', login: 'testuser', roles: userRoles } : null,
        }),
      }),
      getArgs: () => [] as any,
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http' as const,
    } as any;
  }

  // ---------------------------------------------------------------------------
  // 1. Неавторизованный запрос
  // ---------------------------------------------------------------------------
  describe('1. Неавторизованный запрос (user = null)', () => {
    it('должен выбрасывать ForbiddenException если request.user === null', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN],
        [],
        false, // неавторизован
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать ForbiddenException с информативным сообщением', () => {
      const context = createContextForEndpoint([ROLES.ADMIN], [], false);
      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toContain('not authenticated');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Авторизованный с ролью admin — доступ на все endpoint'ы
  // ---------------------------------------------------------------------------
  describe('2. Авторизованный с ролью admin', () => {
    const endpoints: { name: string; roles: string[] }[] = [
      { name: 'GET /status', roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER] },
      { name: 'POST /test-connection', roles: [ROLES.ADMIN, ROLES.DIRECTOR] },
      { name: 'POST /sync', roles: [ROLES.ADMIN, ROLES.DIRECTOR] },
      { name: 'GET /sync-runs', roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER] },
      { name: 'GET /sync-runs/:id', roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER] },
      { name: 'GET /issues', roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER] },
      { name: 'GET /stats', roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER] },
    ];

    endpoints.forEach(({ name, roles }) => {
      it(`доступ разрешён на "${name}"`, () => {
        const context = createContextForEndpoint(roles, [ROLES.ADMIN]);
        expect(guard.canActivate(context)).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Авторизованный с ролью employee — 403 на admin/director/manager endpoints
  // ---------------------------------------------------------------------------
  describe('3. Авторизованный с ролью employee → 403 на admin/director endpoints', () => {
    it('должен выбрасывать 403 на POST /sync (требует admin/director)', () => {
      const context = createContextForEndpoint([ROLES.ADMIN, ROLES.DIRECTOR], [ROLES.EMPLOYEE]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать 403 на POST /test-connection (требует admin/director)', () => {
      const context = createContextForEndpoint([ROLES.ADMIN, ROLES.DIRECTOR], [ROLES.EMPLOYEE]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать 403 на GET /sync-runs/:id (требует admin/director/manager)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER],
        [ROLES.EMPLOYEE],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Авторизованный с ролью viewer — read-only проходит, write — 403
  // ---------------------------------------------------------------------------
  describe('4. Авторизованный с ролью viewer — read-only OK, write/admin 403', () => {
    it('доступ разрешён на GET /status (read-only)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER],
        [ROLES.VIEWER],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('доступ разрешён на GET /issues (read-only)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER],
        [ROLES.VIEWER],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('доступ разрешён на GET /sync-runs (read-only)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER],
        [ROLES.VIEWER],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('доступ разрешён на GET /stats (read-only)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER],
        [ROLES.VIEWER],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('должен выбрасывать 403 на POST /sync (требует admin/director)', () => {
      const context = createContextForEndpoint([ROLES.ADMIN, ROLES.DIRECTOR], [ROLES.VIEWER]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать 403 на POST /test-connection (требует admin/director)', () => {
      const context = createContextForEndpoint([ROLES.ADMIN, ROLES.DIRECTOR], [ROLES.VIEWER]);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('должен выбрасывать 403 на GET /sync-runs/:id (требует admin/director/manager)', () => {
      const context = createContextForEndpoint(
        [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER],
        [ROLES.VIEWER],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Интеграционная проверка метаданных @Roles() на реальном контроллере
  // ---------------------------------------------------------------------------
  describe('5. Метаданные @Roles() на реальных методах YouTrackController', () => {
    it('GET /status имеет роли admin, director, manager, viewer', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.getStatus);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER]),
      );
    });

    it('POST /test-connection имеет роли admin, director', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.testConnection);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR]));
    });

    it('POST /sync имеет роли admin, director', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.startSync);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR]));
    });

    it('GET /sync-runs имеет роли admin, director, manager, viewer', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.getSyncRuns);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER]),
      );
    });

    it('GET /sync-runs/:id имеет роли admin, director, manager', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.getSyncRunDetail);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER]),
      );
    });

    it('GET /issues имеет роли admin, director, manager, viewer', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.getIssues);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER]),
      );
    });

    it('GET /stats имеет роли admin, director, manager, viewer', () => {
      const metadata = Reflect.getMetadata('roles', YouTrackController.prototype.getStats);
      expect(metadata).toBeDefined();
      expect(metadata).toEqual(
        expect.arrayContaining([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.MANAGER, ROLES.VIEWER]),
      );
    });
  });
});
