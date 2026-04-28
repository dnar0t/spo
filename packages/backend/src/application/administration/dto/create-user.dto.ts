/**
 * CreateUserDto
 *
 * DTO для создания нового пользователя.
 */
export class CreateUserDto {
  login: string;
  email: string | null;
  fullName: string | null;
  roleIds: string[];
}
