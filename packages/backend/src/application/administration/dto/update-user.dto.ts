/**
 * UpdateUserDto
 *
 * DTO для обновления профиля пользователя.
 */
export class UpdateUserDto {
  login?: string;
  email?: string | null;
  fullName?: string | null;
  youtrackLogin?: string | null;
  youtrackUserId?: string | null;
  adLogin?: string | null;
}
