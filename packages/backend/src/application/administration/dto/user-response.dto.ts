/**
 * UserResponseDto
 *
 * DTO для ответа с данными пользователя.
 * Включает основные поля, а также ABAC-атрибуты, 2FA и источник.
 */
export class UserResponseDto {
  id: string;
  login: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // ABAC-атрибуты для системы разграничения доступа
  abacProjects: string[];
  abacSystems: string[];
  abacRoles: string[];

  // Двухфакторная аутентификация
  twoFactorEnabled: boolean;

  // Источник данных пользователя (например, 'youtrack', 'ad', 'manual')
  source: string;
}
