import { RefreshSessionRepository } from '../../../domain/repositories/refresh-session.repository';
import { IAuditLogger } from '../ports/audit-logger';

export class LogoutUseCase {
  constructor(
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(
    userId: string,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ success: boolean }> {
    // 1. Revoke all refresh sessions for the user
    await this.refreshSessionRepository.revokeAllByUserId(userId);

    // 2. Audit log
    await this.auditLogger.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      details: { reason: 'User initiated logout' },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return { success: true };
  }
}
