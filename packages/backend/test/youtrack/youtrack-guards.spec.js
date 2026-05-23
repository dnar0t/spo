"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roles_guard_1 = require("../../src/presentation/guards/roles.guard");
const constants_1 = require("../../src/application/auth/constants");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const youtrack_controller_1 = require("../../src/presentation/controllers/youtrack.controller");
describe('YouTrackController — Guards (JwtAuthGuard + RolesGuard)', () => {
    let guard;
    let reflector;
    beforeEach(() => {
        reflector = new core_1.Reflector();
        guard = new roles_guard_1.RolesGuard(reflector);
    });
    function createContextForEndpoint(allowedRoles, userRoles, authenticated = true) {
        const handler = () => { };
        Reflect.defineMetadata('roles', allowedRoles, handler);
        return {
            getHandler: () => handler,
            getClass: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: authenticated ? { id: 'user-1', login: 'testuser', roles: userRoles } : null,
                }),
            }),
            getArgs: () => [],
            getArgByIndex: () => undefined,
            switchToRpc: () => ({}),
            switchToWs: () => ({}),
            getType: () => 'http',
        };
    }
    describe('1. Неавторизованный запрос (user = null)', () => {
        it('должен выбрасывать ForbiddenException если request.user === null', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN], [], false);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать ForbiddenException с информативным сообщением', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN], [], false);
            try {
                guard.canActivate(context);
                fail('Expected ForbiddenException to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.ForbiddenException);
                expect(error.message).toContain('not authenticated');
            }
        });
    });
    describe('2. Авторизованный с ролью admin', () => {
        const endpoints = [
            { name: 'GET /status', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER] },
            { name: 'POST /test-connection', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR] },
            { name: 'POST /sync', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR] },
            { name: 'GET /sync-runs', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER] },
            { name: 'GET /sync-runs/:id', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER] },
            { name: 'GET /issues', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER] },
            { name: 'GET /stats', roles: [constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER] },
        ];
        endpoints.forEach(({ name, roles }) => {
            it(`доступ разрешён на "${name}"`, () => {
                const context = createContextForEndpoint(roles, [constants_1.ROLES.ADMIN]);
                expect(guard.canActivate(context)).toBe(true);
            });
        });
    });
    describe('3. Авторизованный с ролью employee → 403 на admin/director endpoints', () => {
        it('должен выбрасывать 403 на POST /sync (требует admin/director)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR], [constants_1.ROLES.EMPLOYEE]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать 403 на POST /test-connection (требует admin/director)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR], [constants_1.ROLES.EMPLOYEE]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать 403 на GET /sync-runs/:id (требует admin/director/manager)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER], [constants_1.ROLES.EMPLOYEE]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
    });
    describe('4. Авторизованный с ролью viewer — read-only OK, write/admin 403', () => {
        it('доступ разрешён на GET /status (read-only)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER], [constants_1.ROLES.VIEWER]);
            expect(guard.canActivate(context)).toBe(true);
        });
        it('доступ разрешён на GET /issues (read-only)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER], [constants_1.ROLES.VIEWER]);
            expect(guard.canActivate(context)).toBe(true);
        });
        it('доступ разрешён на GET /sync-runs (read-only)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER], [constants_1.ROLES.VIEWER]);
            expect(guard.canActivate(context)).toBe(true);
        });
        it('доступ разрешён на GET /stats (read-only)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER], [constants_1.ROLES.VIEWER]);
            expect(guard.canActivate(context)).toBe(true);
        });
        it('должен выбрасывать 403 на POST /sync (требует admin/director)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR], [constants_1.ROLES.VIEWER]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать 403 на POST /test-connection (требует admin/director)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR], [constants_1.ROLES.VIEWER]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать 403 на GET /sync-runs/:id (требует admin/director/manager)', () => {
            const context = createContextForEndpoint([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER], [constants_1.ROLES.VIEWER]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
    });
    describe('5. Метаданные @Roles() на реальных методах YouTrackController', () => {
        it('GET /status имеет роли admin, director, manager, viewer', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.getStatus);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER]));
        });
        it('POST /test-connection имеет роли admin, director', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.testConnection);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR]));
        });
        it('POST /sync имеет роли admin, director', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.startSync);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR]));
        });
        it('GET /sync-runs имеет роли admin, director, manager, viewer', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.getSyncRuns);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER]));
        });
        it('GET /sync-runs/:id имеет роли admin, director, manager', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.getSyncRunDetail);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER]));
        });
        it('GET /issues имеет роли admin, director, manager, viewer', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.getIssues);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER]));
        });
        it('GET /stats имеет роли admin, director, manager, viewer', () => {
            const metadata = Reflect.getMetadata('roles', youtrack_controller_1.YouTrackController.prototype.getStats);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual(expect.arrayContaining([constants_1.ROLES.ADMIN, constants_1.ROLES.DIRECTOR, constants_1.ROLES.MANAGER, constants_1.ROLES.VIEWER]));
        });
    });
});
//# sourceMappingURL=youtrack-guards.spec.js.map