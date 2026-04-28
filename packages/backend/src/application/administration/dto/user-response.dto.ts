/**
 * UserResponseDto
 *
 * DTO для ответа с данными пользователя.
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
}
