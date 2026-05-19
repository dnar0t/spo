/**
 * UpdateUserDto
 *
 * DTO dlya obnovleniya profilya polzovatelya.
 */
export class UpdateUserDto {
  login?: string;
  email?: string | null;
  fullName?: string | null;
  youtrackLogin?: string | null;
  youtrackUserId?: string | null;
  adLogin?: string | null;
  isActive?: boolean;
  canPlan?: boolean;
}
