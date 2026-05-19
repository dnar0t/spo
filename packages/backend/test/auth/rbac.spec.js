"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const roles_guard_1 = require("../../src/presentation/guards/roles.guard");
const roles_constants_1 = require("../../src/common/auth/roles.constants");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
describe('RBAC: RolesGuard + @Roles decorator', () => {
    let guard;
    let reflector;
    beforeEach(() => {
        reflector = new core_1.Reflector();
        guard = new roles_guard_1.RolesGuard(reflector);
    });
    function createMockContext(handlerRoles, userRoles) {
        const handler = () => { };
        if (handlerRoles && handlerRoles.length > 0) {
            Reflect.defineMetadata('roles', handlerRoles, handler);
        }
        return {
            getHandler: () => handler,
            getClass: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 'user-1', login: 'testuser', roles: userRoles },
                }),
            }),
        };
    }
    describe('RolesGuard', () => {
        it('должен выбрасывать 403 если у пользователя нет нужной роли', () => {
            const context = createMockContext([roles_constants_1.ROLES.ADMIN], ['employee']);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('при наличии роли admin доступ разрешён', () => {
            const context = createMockContext([roles_constants_1.ROLES.ADMIN], [roles_constants_1.ROLES.ADMIN]);
            const result = guard.canActivate(context);
            expect(result).toBe(true);
        });
        it('должен разрешать доступ при наличии одной из нескольких требуемых ролей', () => {
            const context = createMockContext([roles_constants_1.ROLES.ADMIN, roles_constants_1.ROLES.DIRECTOR], [roles_constants_1.ROLES.DIRECTOR]);
            const result = guard.canActivate(context);
            expect(result).toBe(true);
        });
        it('должен разрешать доступ если @Roles не указан (публичный endpoint)', () => {
            const context = createMockContext(undefined, ['employee']);
            const result = guard.canActivate(context);
            expect(result).toBe(true);
        });
        it('должен выбрасывать 403 если пользователь не аутентифицирован', () => {
            const handler = () => { };
            Reflect.defineMetadata('roles', [roles_constants_1.ROLES.ADMIN], handler);
            const context = {
                getHandler: () => handler,
                getClass: () => ({}),
                switchToHttp: () => ({
                    getRequest: () => ({ user: null }),
                }),
                getArgs: () => [],
                getArgByIndex: () => undefined,
                switchToRpc: () => ({}),
                switchToWs: () => ({}),
                getType: () => 'http',
            };
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('должен выбрасывать 403 если у пользователя пустой список ролей', () => {
            const context = createMockContext([roles_constants_1.ROLES.MANAGER], []);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
    });
    describe('@Roles decorator', () => {
        it('@Roles работает с константами из ROLES (а не строковыми литералами)', () => {
            class TestController {
                adminEndpoint() {
                    return 'ok';
                }
            }
            __decorate([
                (0, roles_guard_1.Roles)(roles_constants_1.ROLES.ADMIN, roles_constants_1.ROLES.MANAGER),
                __metadata("design:type", Function),
                __metadata("design:paramtypes", []),
                __metadata("design:returntype", String)
            ], TestController.prototype, "adminEndpoint", null);
            const controller = new TestController();
            const endpointMethod = controller.adminEndpoint;
            const metadata = Reflect.getMetadata('roles', endpointMethod);
            expect(metadata).toBeDefined();
            expect(metadata).toEqual([roles_constants_1.ROLES.ADMIN, roles_constants_1.ROLES.MANAGER]);
            expect(metadata).toContain('admin');
            expect(metadata).toContain('manager');
        });
        it('@Roles с одной ролью корректно сохраняет метаданные', () => {
            class TestController {
                directorEndpoint() {
                    return 'ok';
                }
            }
            __decorate([
                (0, roles_guard_1.Roles)(roles_constants_1.ROLES.DIRECTOR),
                __metadata("design:type", Function),
                __metadata("design:paramtypes", []),
                __metadata("design:returntype", String)
            ], TestController.prototype, "directorEndpoint", null);
            const controller = new TestController();
            const metadata = Reflect.getMetadata('roles', controller.directorEndpoint);
            expect(metadata).toEqual(['director']);
        });
        it('@Roles без аргументов не устанавливает метаданные (доступ всем)', () => {
            class TestController {
                publicEndpoint() {
                    return 'ok';
                }
            }
            __decorate([
                (0, roles_guard_1.Roles)(),
                __metadata("design:type", Function),
                __metadata("design:paramtypes", []),
                __metadata("design:returntype", String)
            ], TestController.prototype, "publicEndpoint", null);
            const controller = new TestController();
            const metadata = Reflect.getMetadata('roles', controller.publicEndpoint);
            expect(metadata).toEqual([]);
        });
    });
});
//# sourceMappingURL=rbac.spec.js.map