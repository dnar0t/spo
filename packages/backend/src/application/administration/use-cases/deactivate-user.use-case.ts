/**
 * DeactivateUserUseCase
 *
 * Use case для мягкого удаления (деактивации) пользователя.
 * Логирует действие в аудит.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';

export class DeactivateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: { id: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Поиск пользователя
    const user = await this.userRepository.findById(dto.id);
    if (!user) {
      throw new Error(`User with id "${dto.id}" not found`);
    }

    // 2. Деактивация (business rule)
    user.deactivate();

    // 3. Сохранение
    await this.userRepository.update(user);

    // 4. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: user.id,
      details: {
        login: user.login,
        email: user.email,
        fullName: user.fullName,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
