/**
 * DeleteRateUseCase
 *
 * Use case для мягкого удаления (деактивации) ставки сотрудника.
 * Проставляет effectiveTo = now() для указанной ставки.
 */
import { EmployeeRateRepository } from '../../../domain/repositories/employee-rate.repository';
import { IAuditLogger } from '../../auth/ports/audit-logger';

export class DeleteRateUseCase {
  constructor(
    private readonly employeeRateRepository: EmployeeRateRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(rateId: string, userId: string): Promise<void> {
    // 1. Найти ставку
    const rate = await this.employeeRateRepository.findById(rateId);

    if (!rate) {
      throw new Error(`Rate not found: ${rateId}`);
    }

    // 2. Если уже деактивирована — можно ничего не делать или выбросить ошибку
    if (rate.effectiveTo) {
      throw new Error(`Rate ${rateId} is already deactivated`);
    }

    // 3. Проставляем effectiveTo = now() для soft delete
    const now = new Date();
    rate.deactivate(now);
    await this.employeeRateRepository.update(rate);

    // 4. Аудит
    await this.auditLogger.log({
      userId,
      action: 'RATE_DELETED',
      entityType: 'EmployeeRateHistory',
      entityId: rateId,
      details: {
        userId: rate.userId,
        effectiveTo: now.toISOString(),
      },
    });
  }
}
