/**
 * PrismaNotificationTemplateRepository
 *
 * Реализация NotificationTemplateRepository с использованием Prisma.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationTemplateRepository } from '../../../domain/repositories/notification-template.repository';
import {
  NotificationTemplate,
  NotificationTemplatePersistenceData,
} from '../../../domain/entities/notification-template.entity';
import { NotFoundError } from '../../../domain/errors/domain.error';

@Injectable()
export class PrismaNotificationTemplateRepository implements NotificationTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(data: {
    id: string;
    eventName: string;
    subject: string;
    body: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    extensions: Record<string, unknown> | null;
  }): NotificationTemplate {
    const persistenceData: NotificationTemplatePersistenceData = {
      id: data.id,
      eventName: data.eventName,
      subject: data.subject,
      body: data.body,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      extensions: data.extensions,
    };

    return NotificationTemplate.fromPersistence(persistenceData);
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    const data = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<NotificationTemplate[]> {
    const records = await this.prisma.notificationTemplate.findMany();
    return records.map((r) => this.toDomain(r));
  }

  async save(entity: NotificationTemplate): Promise<NotificationTemplate> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.notificationTemplate.create({
      data: {
        id: persistence.id as string,
        eventName: persistence.eventName as string,
        subject: persistence.subject as string,
        body: persistence.body as string,
        isActive: persistence.isActive as boolean,
        createdAt: persistence.createdAt as Date,
        updatedAt: persistence.updatedAt as Date,
      },
    });
    return this.toDomain(data);
  }

  async update(entity: NotificationTemplate): Promise<NotificationTemplate> {
    const persistence = entity.toPersistence();
    const data = await this.prisma.notificationTemplate.update({
      where: { id: entity.id },
      data: {
        eventName: persistence.eventName as string,
        subject: persistence.subject as string,
        body: persistence.body as string,
        isActive: persistence.isActive as boolean,
        updatedAt: persistence.updatedAt as Date,
      },
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.notificationTemplate.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundError('NotificationTemplate', id);
    }
  }

  async findByEventName(eventName: string): Promise<NotificationTemplate | null> {
    const data = await this.prisma.notificationTemplate.findUnique({
      where: { eventName },
    });
    return data ? this.toDomain(data) : null;
  }

  async findActiveByEventName(eventName: string): Promise<NotificationTemplate | null> {
    const data = await this.prisma.notificationTemplate.findFirst({
      where: { eventName, isActive: true },
    });
    return data ? this.toDomain(data) : null;
  }
}
