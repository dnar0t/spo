import type { User } from '../entities/user.entity';

/**
 * Тип роли пользователя в системе.
 */
export type UserRole = string;

/**
 * Тип разрешения (права доступа).
 */
export type Permission = string;

/**
 * Контекст доступа — информация о пользователе, выполняющем операцию.
 */
export interface AccessContext {
  userId: string;
  userRoles: UserRole[];

  /**
   * Проверка, является ли пользователь руководителем указанного сотрудника.
   * Может быть синхронной или асинхронной (если требуется запрос к БД).
   */
  isManagerOf?: (employeeId: string) => boolean | Promise<boolean>;

  /** Является ли пользователь оценщиком бизнес-компетенций */
  isBusinessEvaluator?: boolean;

  /** Имеет ли пользователь доступ к просмотру финансов */
  isFinanceViewer?: boolean;
}

/**
 * AccessControlService — сервис для проверки прав доступа на основе RBAC + ABAC.
 *
 * RBAC (Role-Based Access Control): проверка наличия роли.
 * ABAC (Attribute-Based Access Control): проверка дополнительных атрибутов контекста
 * (например, является ли пользователь руководителем целевого сотрудника).
 */
export class AccessControlService {
  /**
   * Проверка, имеет ли пользователь хотя бы одну из указанных ролей (RBAC).
   */
  hasRole(context: AccessContext, ...roles: string[]): boolean {
    return roles.some((role) => context.userRoles.includes(role));
  }

  /**
   * Проверка, может ли пользователь просматривать личный отчёт целевого сотрудника.
   *
   * Разрешено если:
   * - Пользователь просматривает свой собственный отчёт (viewerId === targetUserId);
   * - Пользователь является руководителем целевого сотрудника;
   * - Пользователь имеет роль ADMIN, DIRECTOR, HR или SUPER_HR.
   */
  canViewPersonalReport(viewerId: string, targetUserId: string, context: AccessContext): boolean {
    // Свой отчёт можно смотреть всегда
    if (viewerId === targetUserId) {
      return true;
    }

    // Руководитель может смотреть отчёт подчинённого
    if (context.isManagerOf?.(targetUserId)) {
      return true;
    }

    // Административные роли имеют доступ ко всем отчётам
    return this.hasRole(context, 'admin', 'director', 'hr', 'super_hr');
  }

  /**
   * Проверка, может ли пользователь редактировать оценку руководителя
   * для указанного сотрудника.
   *
   * Разрешено только:
   * - Руководителю этого сотрудника;
   * - Пользователям с ролью ADMIN или DIRECTOR.
   */
  canEditManagerEvaluation(
    viewerId: string,
    targetUserId: string,
    context: AccessContext,
  ): boolean {
    // Руководитель может редактировать оценку подчинённого
    if (context.isManagerOf?.(targetUserId)) {
      return true;
    }

    // Административные роли
    return this.hasRole(context, 'admin', 'director');
  }

  /**
   * Проверка, может ли пользователь редактировать бизнес-оценку.
   *
   * Разрешено если:
   * - Пользователь является бизнес-оценщиком (isBusinessEvaluator);
   * - Пользователь имеет роль ADMIN или DIRECTOR.
   */
  canEditBusinessEvaluation(context: AccessContext): boolean {
    if (context.isBusinessEvaluator) {
      return true;
    }

    return this.hasRole(context, 'admin', 'director');
  }

  /**
   * Проверка, может ли пользователь просматривать финансовые данные.
   *
   * Разрешено если:
   * - Пользователь является финансовым просмотрщиком (isFinanceViewer);
   * - Пользователь имеет роль ADMIN, DIRECTOR или FINANCE.
   */
  canViewFinance(context: AccessContext): boolean {
    if (context.isFinanceViewer) {
      return true;
    }

    return this.hasRole(context, 'admin', 'director', 'finance');
  }

  /**
   * Проверка, может ли пользователь управлять ставками сотрудника.
   *
   * Разрешено:
   * - Руководителю этого сотрудника (управляет ставками подчинённых);
   * - Пользователям с ролью ADMIN, DIRECTOR или HR.
   */
  canManageRates(targetUserId: string, context: AccessContext): boolean {
    if (context.isManagerOf?.(targetUserId)) {
      return true;
    }

    return this.hasRole(context, 'admin', 'director', 'hr');
  }

  /**
   * Проверка, может ли пользователь переоткрыть закрытый период.
   *
   * Разрешено только пользователям с ролью ADMIN или DIRECTOR.
   */
  canReopenPeriod(context: AccessContext): boolean {
    return this.hasRole(context, 'admin', 'director');
  }

  /**
   * Проверка, может ли пользователь экспортировать отчёт.
   *
   * Разрешено:
   * - Любому авторизованному пользователю (по умолчанию);
   * - Конкретные ограничения можно добавить при необходимости.
   */
  canExportReport(context: AccessContext): boolean {
    // По умолчанию экспорт доступен всем авторизованным пользователям
    return true;
  }

  /**
   * Проверка, может ли пользователь изменять фиксированный план (ставку).
   *
   * Разрешено только пользователям с ролью DIRECTOR (директор).
   */
  canModifyFixedPlan(context: AccessContext): boolean {
    return this.hasRole(context, 'director');
  }
}
