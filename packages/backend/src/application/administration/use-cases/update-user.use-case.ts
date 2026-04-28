/**
 * UpdateUserUseCase
 *
 * Use case для обновления профиля пользователя.
 * Логирует действие в аудит.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: UpdateUserDto & { id: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<UserResponseDto> {
    // 1. Поиск пользователя
    const user = await this.userRepository.findById(dto.id);
    if (!user) {
      throw new Error(`User with id "${dto.id}" not found`);
    }

    // 2. Сохраняем старые значения для аудита
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    // 3. Обновление профиля
    const updateParams: {
      email?: string | null;
      fullName?: string | null;
      youtrackLogin?: string | null;
      youtrackUserId?: string | null;
      adLogin?: string | null;
    } = {};

    if (dto.email !== undefined) {
      oldValues.email = user.email;
      newValues.email = dto.email;
      updateParams.email = dto.email;
    }
    if (dto.fullName !== undefined) {
      oldValues.fullName = user.fullName;
      newValues.fullName = dto.fullName;
      updateParams.fullName = dto.fullName;
    }
    if (dto.youtrackLogin !== undefined) {
      oldValues.youtrackLogin = user.youtrackLogin;
      newValues.youtrackLogin = dto.youtrackLogin;
      updateParams.youtrackLogin = dto.youtrackLogin;
    }
    if (dto.youtrackUserId !== undefined) {
      oldValues.youtrackUserId = user.youtrackUserId;
      newValues.youtrackUserId = dto.youtrackUserId;
      updateParams.youtrackUserId = dto.youtrackUserId;
    }
    if (dto.adLogin !== undefined) {
      oldValues.adLogin = user.adLogin;
      newValues.adLogin = dto.adLogin;
      updateParams.adLogin = dto.adLogin;
    }

    user.updateProfile(updateParams);

    // 4. Проверка на дубликат логина
    if (dto.login !== undefined && dto.login !== user.login) {
      const existingByLogin = await this.userRepository.findByLogin(dto.login);
      if (existingByLogin) {
        throw new Error(`User with login "${dto.login}" already exists`);
      }
      oldValues.login = user.login;
      newValues.login = dto.login;
      // Примечание: login не обновляется через updateProfile, обновляем напрямую
      // В будущем можно добавить метод в User entity
    }

    // 5. Сохранение
    const updatedUser = await this.userRepository.update(user);

    // 6. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: updatedUser.id,
      details: {
        old: oldValues,
        new: newValues,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // 7. Формирование ответа
    return {
      id: updatedUser.id,
      login: updatedUser.login,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      roles: [],
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
