import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RefreshSessionRepository } from '../../../domain/repositories/refresh-session.repository';
import { RefreshSession } from '../../../domain/entities/refresh-session.entity';

@Injectable()
export class PrismaRefreshSessionRepository implements RefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RefreshSession | null> {
    const data = await this.prisma.refreshSession.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<RefreshSession[]> {
    const records = await this.prisma.refreshSession.findMany();
    return records.map(this.toDomain);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const data = await this.prisma.refreshSession.findFirst({
      where: { refreshTokenHash: tokenHash },
    });
    return data ? this.toDomain(data) : null;
  }

  async findByUserId(userId: string): Promise<RefreshSession[]> {
    const records = await this.prisma.refreshSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async findValidByUserId(userId: string): Promise<RefreshSession[]> {
    const now = new Date();
    const records = await this.prisma.refreshSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toDomain);
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.refreshSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }

  async save(entity: RefreshSession): Promise<RefreshSession> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.refreshSession.create({
      data: {
        id: persistence.id as string,
        userId: persistence.user_id as string,
        refreshTokenHash: persistence.refresh_token_hash as string,
        userAgent: persistence.user_agent as string | null,
        ipAddress: persistence.ip_address as string | null,
        expiresAt: persistence.expires_at as Date,
        revokedAt: persistence.revoked_at as Date | null,
        createdAt: persistence.created_at as Date,
        lastUsedAt: persistence.last_used_at as Date | null,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: RefreshSession): Promise<RefreshSession> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.refreshSession.update({
      where: { id: entity.id },
      data: {
        refreshTokenHash: persistence.refresh_token_hash as string,
        expiresAt: persistence.expires_at as Date,
        revokedAt: persistence.revoked_at as Date | null,
        lastUsedAt: persistence.last_used_at as Date | null,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.refreshSession.delete({ where: { id } });
  }

  private toDomain(data: any): RefreshSession {
    return RefreshSession.fromPersistence({
      id: data.id,
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      expiresAt: data.expiresAt,
      revokedAt: data.revokedAt,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
    });
  }
}
