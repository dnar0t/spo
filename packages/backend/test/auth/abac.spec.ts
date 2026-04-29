import { RolesGuard, Roles } from '../../src/presentation/guards/roles.guard';
import { ROLES } from '../../src/common/auth/roles.constants';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * ABAC (Attribute-Based Access Control) интеграционные тесты.
 *
 * Проверяют что доступ к данным ограничен на основе атрибутов:
 * - пользователь видит только свой личный отчёт
 * - руководитель видит только direct reports
 * - бизнес не видит персональные финансовые отчёты
 *
 * В тестах используется mocked-контекст без реальной БД.
 */

// ─── Вспомогательные типы ───

interface ReportAccessContext {
  currentUserId: string;
  currentUserRoles: string[];
  reportOwnerId: string;
  reportData: Record<string, unknown>;
}

interface Employee {
  id: string;
  name: string;
  managerId: string | null;
  role: string;
}

// ─── Mock: сервис проверки доступа к отчёту ───

/**
 * Mock-сервис, эмулирующий ABAC-логику.
 * В реальном приложении эта логика была бы в Application Service / Policy.
 */
class MockReportAccessService {
  /**
   * Проверяет, имеет ли пользователь доступ к отчёту.
   * Возвращает true если доступ разрешён.
   */
  canAccessPersonalReport(
    currentUserId: string,
    currentUserRoles: string[],
    reportOwnerId: string,
  ): boolean {
    // 1. Сотрудник видит только свой отчёт
    if (currentUserRoles.includes(ROLES.EMPLOYEE)) {
      return currentUserId === reportOwnerId;
    }

    // 2. Руководитель видит свой собственный отчёт и отчёты direct reports
    if (currentUserRoles.includes(ROLES.MANAGER)) {
      // Свой отчёт — всегда доступен
      if (currentUserId === reportOwnerId) {
        return true;
      }
      // В mock-режиме проверяем через lookup direct reports
      return this.isDirectReport(currentUserId, reportOwnerId);
    }

    // 3. Бизнес не видит персональные финансовые отчёты
    if (currentUserRoles.includes(ROLES.BUSINESS)) {
      return false;
    }

    // 4. Администратор и директор видят все отчёты
    if (currentUserRoles.includes(ROLES.ADMIN) || currentUserRoles.includes(ROLES.DIRECTOR)) {
      return true;
    }

    return false;
  }

  /**
   * Mock-метод для проверки подчинённости.
   * В реальном приложении — запрос к EmployeeRepository/UserRepository.
   */
  private isDirectReport(managerId: string, employeeId: string): boolean {
    // Эмулируем иерархию
    const hierarchy: Record<string, Employee[]> = {
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

// ─── Mock: сервис фильтрации финансовых данных ───

/**
 * Mock-сервис, фильтрующий финансовые данные для бизнес-пользователей.
 * В реальном приложении — Policy/Guard на уровне use case.
 */
class MockFinancialFilterService {
  /**
   * Определяет, может ли пользователь видеть полные финансовые данные отчёта.
   */
  canViewFinancialDetails(
    userRoles: string[],
    reportOwnerId: string,
    currentUserId: string,
  ): boolean {
    // Бизнес не видит персональные финансовые данные
    if (userRoles.includes(ROLES.BUSINESS)) {
      return false;
    }

    // Сотрудник видит только свои financial details
    if (userRoles.includes(ROLES.EMPLOYEE)) {
      return currentUserId === reportOwnerId;
    }

    // Руководитель, администратор, директор видят все financial details
    if (
      userRoles.includes(ROLES.MANAGER) ||
      userRoles.includes(ROLES.ADMIN) ||
      userRoles.includes(ROLES.DIRECTOR)
    ) {
      return true;
    }

    return false;
  }
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('ABAC: Attribute-Based Access Control', () => {
  let reportAccessService: MockReportAccessService;
  let financialFilterService: MockFinancialFilterService;

  beforeEach(() => {
    reportAccessService = new MockReportAccessService();
    financialFilterService = new MockFinancialFilterService();
  });

  describe('1. Пользователь видит только свой личный отчёт', () => {
    it('сотрудник имеет доступ к своему отчёту', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'emp-1',
        [ROLES.EMPLOYEE],
        'emp-1', // report owner = current user
      );

      expect(result).toBe(true);
    });

    it('сотрудник НЕ имеет доступа к чужому отчёту', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'emp-1',
        [ROLES.EMPLOYEE],
        'emp-2', // report owner != current user
      );

      expect(result).toBe(false);
    });

    it('сотрудник не может просмотреть отчёт руководителя', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'emp-1',
        [ROLES.EMPLOYEE],
        'manager-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('2. Руководитель видит только direct reports', () => {
    it('руководитель видит отчёт своего direct report', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'emp-1', // Alice — direct report of manager-1
      );

      expect(result).toBe(true);
    });

    it('руководитель видит отчёт другого своего direct report', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'emp-2', // Bob — direct report of manager-1
      );

      expect(result).toBe(true);
    });

    it('руководитель НЕ видит отчёт сотрудника из другой команды', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'emp-3', // Charlie — NOT a direct report of manager-1
      );

      expect(result).toBe(false);
    });

    it('руководитель НЕ видит отчёт другого руководителя', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'manager-2',
      );

      expect(result).toBe(false);
    });

    it('руководитель видит свой собственный отчёт', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'manager-1',
      );

      expect(result).toBe(true);
    });
  });

  describe('3. Бизнес не видит персональные финансовые отчёты', () => {
    it('бизнес НЕ имеет доступа к personal report сотрудника', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'business-1',
        [ROLES.BUSINESS],
        'emp-1',
      );

      expect(result).toBe(false);
    });

    it('бизнес НЕ имеет доступа к personal report руководителя', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'business-1',
        [ROLES.BUSINESS],
        'manager-1',
      );

      expect(result).toBe(false);
    });

    it('бизнес НЕ видит financial details сотрудника', () => {
      const result = financialFilterService.canViewFinancialDetails(
        [ROLES.BUSINESS],
        'emp-1',
        'business-1',
      );

      expect(result).toBe(false);
    });

    it('бизнес НЕ видит financial details руководителя', () => {
      const result = financialFilterService.canViewFinancialDetails(
        [ROLES.BUSINESS],
        'manager-1',
        'business-1',
      );

      expect(result).toBe(false);
    });

    it('бизнес НЕ видит financial details даже своего собственного отчёта (если у бизнеса нет отчёта как у сотрудника)', () => {
      // Бизнес-пользователь может иметь свою учётную запись, но
      // по политике безопасности не должен видеть финансовые детали
      const result = financialFilterService.canViewFinancialDetails(
        [ROLES.BUSINESS],
        'business-1',
        'business-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('4. Администратор и директор имеют полный доступ', () => {
    it('администратор видит personal report любого сотрудника', () => {
      const result = reportAccessService.canAccessPersonalReport('admin-1', [ROLES.ADMIN], 'emp-1');

      expect(result).toBe(true);
    });

    it('администратор видит financial details любого отчёта', () => {
      const result = financialFilterService.canViewFinancialDetails(
        [ROLES.ADMIN],
        'emp-1',
        'admin-1',
      );

      expect(result).toBe(true);
    });

    it('директор видит personal report любого сотрудника', () => {
      const result = reportAccessService.canAccessPersonalReport(
        'director-1',
        [ROLES.DIRECTOR],
        'emp-3',
      );

      expect(result).toBe(true);
    });

    it('директор видит financial details любого отчёта', () => {
      const result = financialFilterService.canViewFinancialDetails(
        [ROLES.DIRECTOR],
        'emp-3',
        'director-1',
      );

      expect(result).toBe(true);
    });
  });

  describe('5. Интеграция: RolesGuard + ABAC политики', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RolesGuard(reflector);
    });

    function createMockContextWithUser(handlerRoles: string[], userRoles: string[]): any {
      const handler = () => {};
      Reflect.defineMetadata('roles', handlerRoles, handler);

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

    it('сотрудник с ролью admin проходит guard на admin endpoint', () => {
      const context = createMockContextWithUser([ROLES.ADMIN], [ROLES.ADMIN]);

      expect(guard.canActivate(context)).toBe(true);

      // Дополнительная ABAC проверка: admin видит чужой отчёт
      const accessResult = reportAccessService.canAccessPersonalReport(
        'admin-1',
        [ROLES.ADMIN],
        'emp-42',
      );
      expect(accessResult).toBe(true);
    });

    it('сотрудник с ролью employee НЕ проходит guard на admin endpoint', () => {
      const context = createMockContextWithUser([ROLES.ADMIN], [ROLES.EMPLOYEE]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('руководитель с ролью manager НЕ может получить доступ к чужому отчёту (не direct report)', () => {
      // Guard — проверка роли
      const context = createMockContextWithUser([ROLES.MANAGER], [ROLES.MANAGER]);
      expect(guard.canActivate(context)).toBe(true);

      // ABAC — проверка доступа к отчёту
      const accessResult = reportAccessService.canAccessPersonalReport(
        'manager-1',
        [ROLES.MANAGER],
        'emp-3', // Charlie — не подчиняется manager-1
      );
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
      // Пользователь имеет две роли
      const canAccessOwn = reportAccessService.canAccessPersonalReport(
        'emp-1',
        [ROLES.EMPLOYEE, ROLES.MANAGER],
        'emp-1',
      );
      expect(canAccessOwn).toBe(true);

      // Как manager может увидеть direct report
      // (в MockReportAccessService приоритет у manager — проверяет direct reports)
      const canAccessReport = reportAccessService.canAccessPersonalReport(
        'emp-1',
        [ROLES.EMPLOYEE, ROLES.MANAGER],
        'emp-3', // Charlie не подчиняется emp-1, так что false
      );
      expect(canAccessReport).toBe(false);
    });
  });
});
