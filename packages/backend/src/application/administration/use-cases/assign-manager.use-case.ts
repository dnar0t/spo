/**
 * AssignManagerUseCase
 *
 * Use case для привязки руководителя к сотруднику.
 * Логирует действие в аудит.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { EmployeeProfileRepository } from '../../../domain/repositories/employee-profile.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';
import { AssignManagerDto } from '../dto/assign-manager.dto';

export class AssignManagerUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeProfileRepository: EmployeeProfileRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    dto: AssignManagerDto & { userId: string },
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // 1. Проверка существования пользователя
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new Error(`User with id "${dto.userId}" not found`);
    }

    // 2. Если managerId указан, проверить что руководитель существует
    if (dto.managerId) {
      const manager = await this.userRepository.findById(dto.managerId);
      if (!manager) {
        throw new Error(`Manager with id "${dto.managerId}" not found`);
      }

      // Проверка, что сотрудник не назначает сам себя руководителем
      if (dto.managerId === dto.userId) {
        throw new Error('Employee cannot be their own manager');
      }
    }

    // 3. Поиск или создание профиля сотрудника
    let profile = await this.employeeProfileRepository.findByUserId(dto.userId);
    if (!profile) {
      // Создаём новый профиль, так как его ещё нет
      const { EmployeeProfile } = await import('../../../domain/entities/employee-profile.entity');
      profile = EmployeeProfile.create({
        userId: dto.userId,
      });
      profile = await this.employeeProfileRepository.save(profile);
    }

    // 4. Назначение руководителя (business rule)
    const oldManagerId = profile.managerId;
    profile.assignManager(dto.managerId);

    // 5. Сохранение
    await this.employeeProfileRepository.update(profile);

    // 6. Аудит
    await this.auditLogger.log({
      userId: context?.userId ?? 'system',
      action: 'MANAGER_ASSIGNED',
      entityType: 'EmployeeProfile',
      entityId: profile.id,
      details: {
        userId: dto.userId,
        login: user.login,
        oldManagerId,
        newManagerId: dto.managerId,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
