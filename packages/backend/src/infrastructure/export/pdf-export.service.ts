/**
 * PdfExportService (Infrastructure Layer)
 *
 * Сервис генерации PDF-отчётов с использованием PDFKit.
 * Содержит try-catch для импорта библиотеки — если PDFKit не установлен,
 * выбрасывает понятную ошибку с инструкцией по установке.
 *
 * Поддерживаемые типы экспорта:
 * - PLAN: Таблица плановых задач с часами и исполнителями
 * - SUMMARY_REPORT: Сводный отчёт с агрегированными данными
 * - PERSONAL_REPORT: Личный отчёт сотрудника
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IExportService } from '../../application/export/ports/export-service';
import { PrismaReportingPeriodRepository } from '../prisma/repositories/prisma-reporting-period.repository';
import { PrismaPersonalReportRepository } from '../prisma/repositories/prisma-personal-report.repository';
import { PrismaSummaryReportRepository } from '../prisma/repositories/prisma-summary-report.repository';
import { PrismaPlannedTaskRepository } from '../prisma/repositories/prisma-planned-task.repository';
import { NotFoundError } from '../../domain/errors/domain.error';

type PDFDocument = any;

@Injectable()
export class PdfExportService implements IExportService {
  private readonly logger = new Logger(PdfExportService.name);
  private PDFDocument: new (options?: any) => PDFDocument | null = null;

  constructor(
    private readonly reportingPeriodRepository: PrismaReportingPeriodRepository,
    private readonly personalReportRepository: PrismaPersonalReportRepository,
    private readonly summaryReportRepository: PrismaSummaryReportRepository,
    private readonly plannedTaskRepository: PrismaPlannedTaskRepository,
  ) {
    this.tryLoadPdfKit();
  }

  /**
   * Попытка загрузить PDFKit. Если библиотека не установлена,
   * выбрасывается ошибка с инструкцией.
   */
  private tryLoadPdfKit(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PdfKit = require('pdfkit');
      this.PDFDocument = PdfKit;
      this.logger.log('PDFKit loaded successfully');
    } catch {
      this.logger.warn(
        'PDFKit is not installed. PDF export will not be available. ' +
          'Install with: npm install pdfkit @types/pdfkit',
      );
    }
  }

  /**
   * Проверка, что PDFKit доступен.
   */
  private ensurePdfKit(): void {
    if (!this.PDFDocument) {
      throw new Error(
        'PDFKit is not installed. PDF export is not available. ' +
          'Please run: npm install pdfkit @types/pdfkit',
      );
    }
  }

  /**
   * Вспомогательный метод для создания базового PDF-документа
   * с заголовком и метаданными.
   */
  private createDocument(title: string): PDFDocument {
    this.ensurePdfKit();
    const doc = new this.PDFDocument!({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: title,
        Creator: 'SPO System',
        Producer: 'PDFKit',
      },
    });
    return doc;
  }

  /**
   * Добавляет заголовок отчёта в PDF.
   */
  private addHeader(doc: PDFDocument, title: string, subtitle?: string): void {
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    if (subtitle) {
      doc.fontSize(11).font('Helvetica').text(subtitle, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(1);
  }

  /**
   * Добавляет таблицу в PDF.
   * Принимает массив заголовков и массив строк данных.
   */
  private addTable(
    doc: PDFDocument,
    headers: string[],
    rows: string[][],
    columnWidths?: number[],
  ): void {
    const pageWidth = doc.page.width - 80;
    const colWidths = columnWidths || headers.map(() => pageWidth / headers.length);
    const rowHeight = 20;
    const headerBgColor = '#2563eb';
    const evenRowColor = '#f3f4f6';
    const fontSize = 8;

    // Заголовки
    doc.rect(40, doc.y, pageWidth, rowHeight).fill(headerBgColor);
    let xPos = 40;
    headers.forEach((header, i) => {
      doc
        .fontSize(fontSize)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(header, xPos + 3, doc.y + 4, {
          width: colWidths[i] - 6,
          align: 'left',
          lineBreak: false,
        });
      xPos += colWidths[i];
    });
    doc.moveDown(1);

    // Данные
    rows.forEach((row, rowIndex) => {
      const isEven = rowIndex % 2 === 0;
      const yStart = doc.y;

      // Рассчитываем высоту строки по максимальному количеству строк в ячейке
      let maxLines = 1;
      const wrappedTexts: string[] = [];
      row.forEach((cell, i) => {
        const text = String(cell ?? '');
        const lines = Math.ceil(
          doc.fontSize(fontSize).widthOfString(text) / (colWidths[i] - 6) || 1,
        );
        if (lines > maxLines) maxLines = lines;
        wrappedTexts.push(text);
      });

      const actualRowHeight = Math.max(rowHeight, maxLines * 12);

      // Если не помещается на странице — новая страница
      if (yStart + actualRowHeight > doc.page.height - 40) {
        doc.addPage();
        // Повторяем заголовки на новой странице
        doc.rect(40, doc.y, pageWidth, rowHeight).fill(headerBgColor);
        let hx = 40;
        headers.forEach((header, i) => {
          doc
            .fontSize(fontSize)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .text(header, hx + 3, doc.y + 4, {
              width: colWidths[i] - 6,
              align: 'left',
              lineBreak: false,
            });
          hx += colWidths[i];
        });
        doc.moveDown(1);
        const newYStart = doc.y;
        if (isEven) {
          doc.rect(40, newYStart, pageWidth, actualRowHeight).fill(evenRowColor);
        }
        let rx = 40;
        row.forEach((cell, i) => {
          doc
            .fontSize(fontSize)
            .font('Helvetica')
            .fillColor('#333333')
            .text(String(cell ?? ''), rx + 3, newYStart + 2, {
              width: colWidths[i] - 6,
              align: 'left',
              lineBreak: false,
            });
          rx += colWidths[i];
        });
        doc.y = newYStart + actualRowHeight;
      } else {
        if (isEven) {
          doc.rect(40, yStart, pageWidth, actualRowHeight).fill(evenRowColor);
        }
        let dx = 40;
        row.forEach((cell, i) => {
          doc
            .fontSize(fontSize)
            .font('Helvetica')
            .fillColor('#333333')
            .text(String(cell ?? ''), dx + 3, yStart + 2, {
              width: colWidths[i] - 6,
              align: 'left',
              lineBreak: false,
            });
          dx += colWidths[i];
        });
        doc.y = yStart + actualRowHeight;
      }
    });
  }

  /**
   * Собирает PDF в Buffer.
   */
  private bufferPromise(doc: PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));
      doc.end();
    });
  }

  /**
   * Форматирование минут в часы:минуты
   */
  private formatMinutes(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}ч ${m}м`;
  }

  /**
   * Форматирование копеек в рубли
   */
  private formatKopecks(kopecks: number | null | undefined): string {
    if (kopecks === null || kopecks === undefined) return '-';
    return (kopecks / 100).toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    });
  }

  // ─── Экспорт плана ───

  async exportPlan(periodId: string): Promise<Buffer> {
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    const tasks = await this.plannedTaskRepository.findByPeriodId(periodId);
    const doc = this.createDocument(`План периода ${period.month}/${period.year}`);

    this.addHeader(
      doc,
      `План работ на ${period.month}/${period.year}`,
      `Статус: ${period.state.value}`,
    );

    // Информация о периоде
    doc.fontSize(10).font('Helvetica');
    doc.text(`Норма часов: ${period.workHoursPerMonth ?? '-'} ч/мес`);
    doc.moveDown(1);

    if (tasks.length === 0) {
      doc.fontSize(10).text('Нет запланированных задач.');
      return this.bufferPromise(doc);
    }

    const headers = [
      '№',
      'Задача',
      'Название',
      'Исполнитель',
      'Dev (ч)',
      'Test (ч)',
      'Mgmt (ч)',
      'Готовность',
      'План',
    ];
    const rows = tasks.map((t, i) => [
      String(i + 1),
      t.issueNumber,
      t.summary.length > 40 ? t.summary.substring(0, 40) + '...' : t.summary,
      t.assigneeId ?? '-',
      this.formatMinutes(t.plannedDevMinutes?.minutes ?? null),
      this.formatMinutes(t.plannedTestMinutes?.minutes ?? null),
      this.formatMinutes(t.plannedMgmtMinutes?.minutes ?? null),
      `${((t.readinessPercent?.basisPoints ?? 0) / 100).toFixed(1)}%`,
      t.isPlanned ? 'Да' : 'Нет',
    ]);

    const colWidths = [25, 70, 140, 70, 60, 60, 60, 60, 50];
    this.addTable(doc, headers, rows, colWidths);

    // Итоговая строка
    doc.moveDown(1);
    const totalDev = tasks.reduce((s, t) => s + (t.plannedDevMinutes?.minutes ?? 0), 0);
    const totalTest = tasks.reduce((s, t) => s + (t.plannedTestMinutes?.minutes ?? 0), 0);
    const totalMgmt = tasks.reduce((s, t) => s + (t.plannedMgmtMinutes?.minutes ?? 0), 0);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(
      `Итого: Dev: ${this.formatMinutes(totalDev)} | Test: ${this.formatMinutes(totalTest)} | Mgmt: ${this.formatMinutes(totalMgmt)} | Всего: ${this.formatMinutes(totalDev + totalTest + totalMgmt)}`,
    );

    return this.bufferPromise(doc);
  }

  // ─── Экспорт сводного отчёта ───

  async exportSummaryReport(periodId: string): Promise<Buffer> {
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    const lines = await this.summaryReportRepository.findByPeriodId(periodId);
    const doc = this.createDocument(`Сводный отчёт ${period.month}/${period.year}`);

    this.addHeader(
      doc,
      `Сводный отчёт за ${period.month}/${period.year}`,
      `Статус периода: ${period.state.value}`,
    );

    if (lines.length === 0) {
      doc.fontSize(10).text('Нет данных для отчёта.');
      return this.bufferPromise(doc);
    }

    const headers = [
      '№',
      'Задача',
      'Название',
      'Проект',
      'Исполнитель',
      'Plan (ч)',
      'Fact (ч)',
      'Остаток (ч)',
      'Plan (₽)',
      'Fact (₽)',
    ];
    const rows = lines.map((l, i) => [
      String(i + 1),
      l.issueNumber,
      l.summary.length > 35 ? l.summary.substring(0, 35) + '...' : l.summary,
      l.projectName ?? '-',
      l.assigneeName ?? '-',
      this.formatMinutes(l.totalPlannedMinutes.minutes),
      this.formatMinutes(l.totalActualMinutes.minutes),
      this.formatMinutes(l.remainingMinutes?.minutes ?? 0),
      this.formatKopecks(l.plannedCost?.kopecks ?? null),
      this.formatKopecks(l.actualCost?.kopecks ?? null),
    ]);

    const colWidths = [25, 70, 120, 70, 70, 55, 55, 60, 65, 65];
    this.addTable(doc, headers, rows, colWidths);

    // Итоги
    doc.moveDown(1);
    const totalPlannedCost = lines.reduce((s, l) => s + (l.plannedCost?.kopecks ?? 0), 0);
    const totalActualCost = lines.reduce((s, l) => s + (l.actualCost?.kopecks ?? 0), 0);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(
      `Итого: План: ${this.formatKopecks(totalPlannedCost)} | Факт: ${this.formatKopecks(totalActualCost)} | ` +
        `Запланировано задач: ${lines.filter((l) => l.isPlanned).length} из ${lines.length}`,
    );

    return this.bufferPromise(doc);
  }

  // ─── Экспорт личного отчёта ───

  async exportPersonalReport(periodId: string, userId: string): Promise<Buffer> {
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    const reports = await this.personalReportRepository.findByPeriodAndUserId(periodId, userId);
    const doc = this.createDocument(`Личный отчёт сотрудника`);

    this.addHeader(
      doc,
      `Личный отчёт за ${period.month}/${period.year}`,
      `Пользователь: ${userId} | Статус: ${period.state.value}`,
    );

    if (reports.length === 0) {
      doc.fontSize(10).text('Нет данных для отчёта.');
      return this.bufferPromise(doc);
    }

    const headers = [
      '№',
      'Задача',
      'Название',
      'Plan (ч)',
      'Fact (ч)',
      'Остаток (ч)',
      'База (₽)',
      'На руки (₽)',
      'С налогами (₽)',
    ];
    const rows = reports.map((r, i) => [
      String(i + 1),
      r.issueNumber,
      r.summary.length > 35 ? r.summary.substring(0, 35) + '...' : r.summary,
      this.formatMinutes(r.totalPlannedMinutes.minutes),
      this.formatMinutes(r.totalActualMinutes.minutes),
      this.formatMinutes(r.remainingMinutes?.minutes ?? 0),
      this.formatKopecks(r.baseAmount?.kopecks ?? null),
      this.formatKopecks(r.totalOnHand?.kopecks ?? null),
      this.formatKopecks(r.totalWithTax?.kopecks ?? null),
    ]);

    const colWidths = [25, 70, 130, 55, 55, 60, 70, 80, 80];
    this.addTable(doc, headers, rows, colWidths);

    // Итоги
    doc.moveDown(1);
    const totalBase = reports.reduce((s, r) => s + (r.baseAmount?.kopecks ?? 0), 0);
    const totalOnHand = reports.reduce((s, r) => s + (r.totalOnHand?.kopecks ?? 0), 0);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(
      `Итого: База: ${this.formatKopecks(totalBase)} | На руки: ${this.formatKopecks(totalOnHand)} | Задач: ${reports.length}`,
    );

    return this.bufferPromise(doc);
  }

  // ─── Экспорт аудит-лога (не поддерживается в PDF) ───

  async exportAuditLog(_params: {
    periodId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Buffer> {
    throw new Error('Audit log export is only supported in Excel format.');
  }

  // ─── Экспорт JSON для бухгалтерии ───

  async exportJsonAccounting(periodId: string): Promise<Buffer> {
    throw new Error('Accounting export is only supported in JSON format.');
  }
}
