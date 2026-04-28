import { UserRepository } from '../../../domain/repositories/user.repository';
import { NotFoundError } from '../../../domain/errors/domain.error';

export interface CurrentUserDto {
  id: string;
  login: string;
  fullName: string | null;
  email: string | null;
  roles: string[];
  isActive: boolean;
  isBlocked: boolean;
  employmentDate: Date | null;
  terminationDate: Date | null;
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<CurrentUserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Roles will be populated from user roles repository in production
    const roles: string[] = [];

    return {
      id: user.id,
      login: user.login,
      fullName: user.fullName,
      email: user.email,
      roles,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      employmentDate: user.employmentDate,
      terminationDate: user.terminationDate,
    };
  }
}
