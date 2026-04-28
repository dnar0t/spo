/**
 * GetActiveSessionsUseCase
 *
 * Use case для получения всех активных сессий пользователей.
 * Используется администраторами для мониторинга текущих сессий.
 */
import { RefreshSessionRepository } from '../../../domain/repositories/refresh-session.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';

export class GetActiveSessionsUseCase {
  constructor(
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<any[]> {
    // Получаем всех пользователей и их активные сессии
    // Для простоты — получаем всех активных пользователей и их последние сессии
    const users = await this.userRepository.findAllActive();
    const result = [];

    for (const user of users) {
      const sessions = await this.refreshSessionRepository.findValidByUserId(user.id);
      for (const session of sessions) {
        result.push({
          userId: user.id,
          login: user.login,
          fullName: user.fullName,
          sessionId: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt.toISOString(),
          lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
          expiresAt: session.expiresAt.toISOString(),
        });
      }
    }

    return result;
  }
}
