/**
 * Константы ролей для RBAC
 *
 * Используются с декоратором @Roles() и RolesGuard.
 *
 * @example
 * ```typescript
 * import { Roles } from '@presentation/guards/roles.guard';
 * import { ROLES } from '@common/auth/roles.constants';
 *
 * @Roles(ROLES.ADMIN, ROLES.DIRECTOR)
 * @Get('admin-only')
 * endpoint() { ... }
 * ```
 */
export const ROLES = {
  /** Администратор системы */
  ADMIN: 'admin',
  /** Директор */
  DIRECTOR: 'director',
  /** Руководитель / менеджер */
  MANAGER: 'manager',
  /** Бизнес-пользователь */
  BUSINESS: 'business',
  /** Рядовой сотрудник */
  EMPLOYEE: 'employee',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
