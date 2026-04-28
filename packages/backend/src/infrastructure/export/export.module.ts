import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExcelExportService } from './excel-export.service';
import { PdfExportService } from './pdf-export.service';
import { JsonExportService } from './json-export.service';
import { FileStorageService } from './file-storage.service';
import { ExportJobRepository } from '../../domain/repositories/export-job.repository';
import { JsonExportJobRepository } from './json-export-job.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    // ─── Export Services ───
    {
      provide: 'IExportService',
      useClass: ExcelExportService,
    },
    {
      provide: 'IFileStorage',
      useClass: FileStorageService,
    },
    {
      provide: ExportJobRepository,
      useClass: JsonExportJobRepository,
    },

    // ─── Concrete Services (also register them directly for flexibility) ───
    ExcelExportService,
    PdfExportService,
    JsonExportService,
    FileStorageService,
    JsonExportJobRepository,
  ],
  exports: [
    'IExportService',
    'IFileStorage',
    ExportJobRepository,
    ExcelExportService,
    PdfExportService,
    JsonExportService,
    FileStorageService,
    JsonExportJobRepository,
  ],
})
export class ExportModule {}
