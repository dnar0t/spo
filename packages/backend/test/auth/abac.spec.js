"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roles_guard_1 = require("../../src/presentation/guards/roles.guard");
const roles_constants_1 = require("../../src/common/auth/roles.constants");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
class MockReportAccessService {
    canAccessPersonalReport(currentUserId, currentUserRoles, reportOwnerId) {
        if (currentUserRoles.includes(roles_constants_1.ROLES.EMPLOYEE)) {
            return currentUserId === reportOwnerId;
        }
        if (currentUserRoles.includes(roles_constants_1.ROLES.MANAGER)) {
            if (currentUserId === reportOwnerId) {
                return true;
            }
            return this.isDirectReport(currentUserId, reportOwnerId);
        }
        if (currentUserRoles.includes(roles_constants_1.ROLES.BUSINESS)) {
            return false;
        }
        if (currentUserRoles.includes(roles_constants_1.ROLES.ADMIN) || currentUserRoles.includes(roles_constants_1.ROLES.DIRECTOR)) {
            return true;
        }
        return false;
    }
    isDirectReport(managerId, employeeId) {
        const hierarchy = {
            'manager-1': [
                { id: 'emp-1', name: 'Alice', managerId: 'manager-1', role: 'employee' },
                { id: 'emp-2', name: 'Bob', managerId: 'manager-1', role: 'employee' },
            ],
            'manager-2': [{ id: 'emp-3', name: 'Charlie', managerId: 'manager-2', role: 'employee' }],
        };
        const reports = hierarchy[managerId] ?? [];
        return reports.some((emp) => emp.id === employeeId);
    }
}
class MockFinancialFilterService {
    canViewFinancialDetails(userRoles, reportOwnerId, currentUserId) {
        if (userRoles.includes(roles_constants_1.ROLES.BUSINESS)) {
            return false;
        }
        if (userRoles.includes(roles_constants_1.ROLES.EMPLOYEE)) {
            return currentUserId === reportOwnerId;
        }
        if (userRoles.includes(roles_constants_1.ROLES.MANAGER) ||
            userRoles.includes(roles_constants_1.ROLES.ADMIN) ||
            userRoles.includes(roles_constants_1.ROLES.DIRECTOR)) {
            return true;
        }
        return false;
    }
}
describe('ABAC: Attribute-Based Access Control', () => {
    let reportAccessService;
    let financialFilterService;
    beforeEach(() => {
        reportAccessService = new MockReportAccessService();
        financialFilterService = new MockFinancialFilterService();
    });
    describe('1. Пользователь видит только свой личный отчёт', () => {
        it('сотрудник имеет доступ к своему отчёту', () => {
            const result = reportAccessService.canAccessPersonalReport('emp-1', [roles_constants_1.ROLES.EMPLOYEE], 'emp-1');
            expect(result).toBe(true);
        });
        it('сотрудник НЕ имеет доступа к чужому отчёту', () => {
            const result = reportAccessService.canAccessPersonalReport('emp-1', [roles_constants_1.ROLES.EMPLOYEE], 'emp-2');
            expect(result).toBe(false);
        });
        it('сотрудник не может просмотреть отчёт руководителя', () => {
            const result = reportAccessService.canAccessPersonalReport('emp-1', [roles_constants_1.ROLES.EMPLOYEE], 'manager-1');
            expect(result).toBe(false);
        });
    });
    describe('2. Руководитель видит только direct reports', () => {
        it('руководитель видит отчёт своего direct report', () => {
            const result = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'emp-1');
            expect(result).toBe(true);
        });
        it('руководитель видит отчёт другого своего direct report', () => {
            const result = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'emp-2');
            expect(result).toBe(true);
        });
        it('руководитель НЕ видит отчёт сотрудника из другой команды', () => {
            const result = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'emp-3');
            expect(result).toBe(false);
        });
        it('руководитель НЕ видит отчёт другого руководителя', () => {
            const result = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'manager-2');
            expect(result).toBe(false);
        });
        it('руководитель видит свой собственный отчёт', () => {
            const result = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'manager-1');
            expect(result).toBe(true);
        });
    });
    describe('3. Бизнес не видит персональные финансовые отчёты', () => {
        it('бизнес НЕ имеет доступа к personal report сотрудника', () => {
            const result = reportAccessService.canAccessPersonalReport('business-1', [roles_constants_1.ROLES.BUSINESS], 'emp-1');
            expect(result).toBe(false);
        });
        it('бизнес НЕ имеет доступа к personal report руководителя', () => {
            const result = reportAccessService.canAccessPersonalReport('business-1', [roles_constants_1.ROLES.BUSINESS], 'manager-1');
            expect(result).toBe(false);
        });
        it('бизнес НЕ видит financial details сотрудника', () => {
            const result = financialFilterService.canViewFinancialDetails([roles_constants_1.ROLES.BUSINESS], 'emp-1', 'business-1');
            expect(result).toBe(false);
        });
        it('бизнес НЕ видит financial details руководителя', () => {
            const result = financialFilterService.canViewFinancialDetails([roles_constants_1.ROLES.BUSINESS], 'manager-1', 'business-1');
            expect(result).toBe(false);
        });
        it('бизнес НЕ видит financial details даже своего собственного отчёта (если у бизнеса нет отчёта как у сотрудника)', () => {
            const result = financialFilterService.canViewFinancialDetails([roles_constants_1.ROLES.BUSINESS], 'business-1', 'business-1');
            expect(result).toBe(false);
        });
    });
    describe('4. Администратор и директор имеют полный доступ', () => {
        it('администратор видит personal report любого сотрудника', () => {
            const result = reportAccessService.canAccessPersonalReport('admin-1', [roles_constants_1.ROLES.ADMIN], 'emp-1');
            expect(result).toBe(true);
        });
        it('администратор видит financial details любого отчёта', () => {
            const result = financialFilterService.canViewFinancialDetails([roles_constants_1.ROLES.ADMIN], 'emp-1', 'admin-1');
            expect(result).toBe(true);
        });
        it('директор видит personal report любого сотрудника', () => {
            const result = reportAccessService.canAccessPersonalReport('director-1', [roles_constants_1.ROLES.DIRECTOR], 'emp-3');
            expect(result).toBe(true);
        });
        it('директор видит financial details любого отчёта', () => {
            const result = financialFilterService.canViewFinancialDetails([roles_constants_1.ROLES.DIRECTOR], 'emp-3', 'director-1');
            expect(result).toBe(true);
        });
    });
    describe('5. Интеграция: RolesGuard + ABAC политики', () => {
        let guard;
        let reflector;
        beforeEach(() => {
            reflector = new core_1.Reflector();
            guard = new roles_guard_1.RolesGuard(reflector);
        });
        function createMockContextWithUser(handlerRoles, userRoles) {
            const handler = () => { };
            Reflect.defineMetadata('roles', handlerRoles, handler);
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
        it('сотрудник с ролью admin проходит guard на admin endpoint', () => {
            const context = createMockContextWithUser([roles_constants_1.ROLES.ADMIN], [roles_constants_1.ROLES.ADMIN]);
            expect(guard.canActivate(context)).toBe(true);
            const accessResult = reportAccessService.canAccessPersonalReport('admin-1', [roles_constants_1.ROLES.ADMIN], 'emp-42');
            expect(accessResult).toBe(true);
        });
        it('сотрудник с ролью employee НЕ проходит guard на admin endpoint', () => {
            const context = createMockContextWithUser([roles_constants_1.ROLES.ADMIN], [roles_constants_1.ROLES.EMPLOYEE]);
            expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
        });
        it('руководитель с ролью manager НЕ может получить доступ к чужому отчёту (не direct report)', () => {
            const context = createMockContextWithUser([roles_constants_1.ROLES.MANAGER], [roles_constants_1.ROLES.MANAGER]);
            expect(guard.canActivate(context)).toBe(true);
            const accessResult = reportAccessService.canAccessPersonalReport('manager-1', [roles_constants_1.ROLES.MANAGER], 'emp-3');
            expect(accessResult).toBe(false);
        });
    });
    describe('6. Edge cases', () => {
        it('пользователь без ролей не имеет доступа ни к одному отчёту', () => {
            const result = reportAccessService.canAccessPersonalReport('unknown-user', [], 'emp-1');
            expect(result).toBe(false);
        });
        it('пользователь с несуществующей ролью не имеет доступа', () => {
            const result = reportAccessService.canAccessPersonalReport('guest-1', ['guest'], 'emp-1');
            expect(result).toBe(false);
        });
        it('сотрудник с множественными ролями (employee + manager) видит и свой отчёт, и direct reports', () => {
            const canAccessOwn = reportAccessService.canAccessPersonalReport('emp-1', [roles_constants_1.ROLES.EMPLOYEE, roles_constants_1.ROLES.MANAGER], 'emp-1');
            expect(canAccessOwn).toBe(true);
            const canAccessReport = reportAccessService.canAccessPersonalReport('emp-1', [roles_constants_1.ROLES.EMPLOYEE, roles_constants_1.ROLES.MANAGER], 'emp-3');
            expect(canAccessReport).toBe(false);
        });
    });
});
//# sourceMappingURL=abac.spec.js.map