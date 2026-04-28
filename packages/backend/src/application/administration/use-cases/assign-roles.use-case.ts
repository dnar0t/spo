/**
 * AssignRolesUseCase
 *
 * Use case для назначения ролей пользователю.
 * Логирует действие в аудит.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { AssignRolesDto } from '../dto/assign-roles.dto';

export class AssignRolesUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: AssignRolesDto & { userId: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Поиск пользователя
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new Error(`User with id "${dto.userId}" not found`);
    }

    // 2. Аудит — записываем назначение ролей
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'ROLES_ASSIGNED',
      entityType: 'User',
      entityId: user.id,
      details: {
        login: user.login,
        email: user.email,
        roleIds: dto.roleIds,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
