/**
 * JsonExportJobRepository (Infrastructure Layer)
 *
 * Prisma-реализация ExportJobRepository для хранения задач на экспорт
 * в таблице export_jobs.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportJobRepository } from '../../domain/repositories/export-job.repository';
import { ExportJob } from '../../domain/entities/export-job.entity';

@Injectable()
export class JsonExportJobRepository implements ExportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ExportJob | null> {
    const record = await this.prisma.exportJob.findUnique({ where: { id } });
    return record ? ExportJob.fromPersistence(record as any) : null;
  }

  async findAll(): Promise<ExportJob[]> {
    const records = await this.prisma.exportJob.findMany();
    return records.map((r: any) => ExportJob.fromPersistence(r));
  }

  async save(entity: ExportJob): Promise<ExportJob> {
    const data = entity.toPersistence();
    const record = await this.prisma.exportJob.create({ data: data as any });
    return ExportJob.fromPersistence(record as any);
  }

  async update(entity: ExportJob): Promise<ExportJob> {
    const data = entity.toPersistence();
    const record = await this.prisma.exportJob.update({
      where: { id: entity.id },
      data: data as any,
    });
    return ExportJob.fromPersistence(record as any);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.exportJob.delete({ where: { id } });
  }

  async findByUserId(userId: string): Promise<ExportJob[]> {
    const records = await this.prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => ExportJob.fromPersistence(r));
  }

  async findByStatus(status: string): Promise<ExportJob[]> {
    const records = await this.prisma.exportJob.findMany({
      where: { status: status as any },
    });
    return records.map((r: any) => ExportJob.fromPersistence(r));
  }

  async findPending(): Promise<ExportJob[]> {
    return this.findByStatus('PENDING');
  }

  async findExpired(): Promise<ExportJob[]> {
    const records = await this.prisma.exportJob.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    });
    return records.map((r: any) => ExportJob.fromPersistence(r));
  }
}
