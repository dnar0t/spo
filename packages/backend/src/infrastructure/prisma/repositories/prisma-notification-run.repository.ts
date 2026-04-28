/**
 * PrismaNotificationRunRepository
 *
 * Реализация NotificationRunRepository с использованием Prisma.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationRunRepository } from '../../../domain/repositories/notification-run.repository';
import {
  NotificationRun,
  NotificationRunPersistenceData,
  NotificationRunStatus,
} from '../../../domain/entities/notification-run.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaNotificationRunRepository implements NotificationRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(data: {
    id: string;
    templateId: string | null;
    eventName: string;
    recipientId: string;
    status: string;
    error: string | null;
    sentAt: Date | null;
    createdAt: Date;
  }): NotificationRun {
    const persistenceData: NotificationRunPersistenceData = {
      id: data.id,
      templateId: data.templateId,
      eventName: data.eventName,
      recipientId: data.recipientId,
      status: data.status,
      error: data.error,
      sentAt: data.sentAt,
      createdAt: data.createdAt,
    };

    return NotificationRun.fromPersistence(persistenceData);
  }

  async findById(id: string): Promise<NotificationRun | null> {
    const data = await this.prisma.notificationRun.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<NotificationRun[]> {
    const records = await this.prisma.notificationRun.findMany();
    return records.map((r) => this.toDomain(r));
  }

  async save(entity: NotificationRun): Promise<NotificationRun> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.notificationRun.create({
      data: {
        id: persistence.id as string,
        templateId: persistence.templateId as string | null,
        eventName: persistence.eventName as string,
        recipientId: persistence.recipientId as string,
        status: persistence.status as string,
        error: persistence.error as string | null,
        sentAt: persistence.sentAt as Date | null,
        createdAt: persistence.createdAt as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: NotificationRun): Promise<NotificationRun> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.notificationRun.update({
      where: { id: entity.id },
      data: {
        status: persistence.status as string,
        error: persistence.error as string | null,
        sentAt: persistence.sentAt as Date | null,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.notificationRun.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('NotificationRun', id);
    }
  }

  async findByRecipientId(recipientId: string): Promise<NotificationRun[]> {
    const records = await this.prisma.notificationRun.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByStatus(status: string): Promise<NotificationRun[]> {
    const records = await this.prisma.notificationRun.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByEventName(eventName: string): Promise<NotificationRun[]> {
    const records = await this.prisma.notificationRun.findMany({
      where: { eventName },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findPending(): Promise<NotificationRun[]> {
    const records = await this.prisma.notificationRun.findMany({
      where: { status: 'PENDING' },
    });
    return records.map((r) => this.toDomain(r));
  }
}
