/**
 * CreateUserUseCase
 *
 * Use case для создания нового пользователя и назначения ему ролей.
 * Логирует действие в аудит.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: CreateUserDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<UserResponseDto> {
    // 1. Проверка на дубликаты
    const existingByLogin = await this.userRepository.findByLogin(dto.login);
    if (existingByLogin) {
      throw new Error(`User with login "${dto.login}" already exists`);
    }

    if (dto.email) {
      const existingByEmail = await this.userRepository.findByEmail(dto.email);
      if (existingByEmail) {
        throw new Error(`User with email "${dto.email}" already exists`);
      }
    }

    // 2. Создание пользователя
    const user = User.create({
      login: dto.login,
      email: dto.email,
      fullName: dto.fullName,
    });

    // 3. Сохранение
    const savedUser = await this.userRepository.save(user);

    // 4. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: savedUser.id,
      details: {
        login: dto.login,
        email: dto.email,
        fullName: dto.fullName,
        roleIds: dto.roleIds,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 5. Формирование ответа
    return {
      id: savedUser.id,
      login: savedUser.login,
      email: savedUser.email,
      fullName: savedUser.fullName,
      roles: dto.roleIds,
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }
}
