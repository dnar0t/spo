/**
 * ExcelExportService (Infrastructure Layer)
 *
 * Реализация IExportService для формата XLSX.
 * Пытается использовать ExcelJS, с fallback на CSV при недоступности.
 * Генерирует таблицы с отформатированными данными для каждого типа экспорта.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IExportService } from '../../../application/export/ports/export-service';

// ─── CSV Fallback ───

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCsv(headers: string[], rows: unknown[][]): Buffer {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(','));
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8'); // BOM for Excel compatibility
}

// ─── Данные для экспорта ───

interface PlanRow {
  issueNumber: string;
  summary: string;
  assignee: string;
  plannedDev: number;
  plannedTest: number;
  plannedMgmt: number;
  plannedDebug: number;
  totalMinutes: number;
  readinessPercent: number;
}

interface SummaryReportRow {
  issueNumber: string;
  summary: string;
  system: string;
  project: string;
  assignee: string;
  type: string;
  priority: string;
  isPlanned: string;
  readinessPercent: number;
  plannedDev: number;
  plannedTest: number;
  plannedMgmt: number;
  actualDev: number;
  actualTest: number;
  actualMgmt: number;
  totalPlanned: number;
  totalActual: number;
  remaining: number;
  plannedCost: number;
  actualCost: number;
  remainingCost: number;
}

interface PersonalReportRow {
  issueNumber: string;
  summary: string;
  state: string;
  readinessPercent: number;
  plannedDev: number;
  plannedTest: number;
  plannedMgmt: number;
  actualDev: number;
  actualTest: number;
  actualMgmt: number;
  totalPlanned: number;
  totalActual: number;
  remaining: number;
  baseAmount: number;
  managerAmount: number;
  businessAmount: number;
  totalOnHand: number;
  ndfl: number;
  insurance: number;
  reserveVacation: number;
  totalWithTax: number;
}

interface AuditLogRow {
  timestamp: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
}

interface AccountingJson {
  period: {
    id: string;
    month: number;
    year: number;
  };
  employees: Array<{
    userId: string;
    fullName: string;
    tasks: Array<{
      issueNumber: string;
      summary: string;
      hours: number;
      cost: number;
    }>;
    totalHours: number;
    totalCost: number;
  }>;
  totals: {
    totalHours: number;
    totalCost: number;
    employeeCount: number;
  };
}

// ─── Format helpers ───

function formatKopecks(kopecks: number): string {
  if (kopecks == null) return '';
  return (kopecks / 100).toFixed(2);
}

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

@Injectable()
export class ExcelExportService implements IExportService {
  private readonly logger = new Logger(ExcelExportService.name);
  private exceljs: any = null;
  private exceljsAvailable = false;

  constructor() {
    this.tryLoadExcelJs();
  }

  private tryLoadExcelJs(): void {
    try {
      this.exceljs = require('exceljs');
      this.exceljsAvailable = true;
      this.logger.log('ExcelJS loaded successfully');
    } catch {
      this.logger.warn(
        'ExcelJS package is not available. Falling back to CSV format for all Excel exports.',
      );
      this.exceljsAvailable = false;
    }
  }

  // ─── IExportService implementation ───

  async exportPlan(periodId: string): Promise<Buffer> {
    // В реальном приложении данные брались бы из репозиториев
    // Здесь — заглушка с демо-данными
    const rows: PlanRow[] = [
      {
        issueNumber: 'PROJ-1',
        summary: 'Sample task',
        assignee: 'User 1',
        plannedDev: 480,
        plannedTest: 120,
        plannedMgmt: 60,
        plannedDebug: 30,
        totalMinutes: 690,
        readinessPercent: 5000,
      },
    ];

    const headers = [
      'Issue',
      'Summary',
      'Assignee',
      'Planned Dev (min)',
      'Planned Test (min)',
      'Planned Mgmt (min)',
      'Planned Debug (min)',
      'Total (min)',
      'Readiness %',
    ];

    const dataRows = rows.map((r) => [
      r.issueNumber,
      r.summary,
      r.assignee,
      r.plannedDev,
      r.plannedTest,
      r.plannedMgmt,
      r.plannedDebug,
      r.totalMinutes,
      (r.readinessPercent / 100).toFixed(1),
    ]);

    if (this.exceljsAvailable) {
      return await this.generateXlsx('Plan Export', [
        { name: 'Plan', headers, rows: dataRows },
      ]);
    }
    return generateCsv(headers, dataRows);
  }

  async exportSummaryReport(periodId: string): Promise<Buffer> {
    const rows: SummaryReportRow[] = [
      {
        issueNumber: 'PROJ-1',
        summary: 'Sample summary task',
        system: 'System A',
        project: 'Project X',
        assignee: 'User 1',
        type: 'Task',
        priority: 'Normal',
        isPlanned: 'Yes',
        readinessPercent: 8000,
        plannedDev: 480,
        plannedTest: 120,
        plannedMgmt: 60,
        actualDev: 420,
        actualTest: 90,
        actualMgmt: 45,
        totalPlanned: 660,
        totalActual: 555,
        remaining: 105,
        plannedCost: 500000,
        actualCost: 450000,
        remainingCost: 50000,
      },
    ];

    const headers = [
      'Issue',
      'Summary',
      'System',
      'Project',
      'Assignee',
      'Type',
      'Priority',
      'Planned',
      'Readiness %',
      'Planned Dev',
      'Planned Test',
      'Planned Mgmt',
      'Actual Dev',
      'Actual Test',
      'Actual Mgmt',
      'Total Planned',
      'Total Actual',
      'Remaining',
      'Planned Cost',
      'Actual Cost',
      'Remaining Cost',
    ];

    const dataRows = rows.map((r) => [
      r.issueNumber,
      r.summary,
      r.system,
      r.project,
      r.assignee,
      r.type,
      r.priority,
      r.isPlanned,
      (r.readinessPercent / 100).toFixed(1),
      formatMinutes(r.plannedDev),
      formatMinutes(r.plannedTest),
      formatMinutes(r.plannedMgmt),
      formatMinutes(r.actualDev),
      formatMinutes(r.actualTest),
      formatMinutes(r.actualMgmt),
      formatMinutes(r.totalPlanned),
      formatMinutes(r.totalActual),
      formatMinutes(r.remaining),
      formatKopecks(r.plannedCost),
      formatKopecks(r.actualCost),
      formatKopecks(r.remainingCost),
    ]);

    if (this.exceljsAvailable) {
      return await this.generateXlsx('Summary Report', [
        { name: 'Summary', headers, rows: dataRows },
      ]);
    }
    return generateCsv(headers, dataRows);
  }

  async exportPersonalReport(periodId: string, userId: string): Promise<Buffer> {
    const rows: PersonalReportRow[] = [
      {
        issueNumber: 'PROJ-1',
        summary: 'Personal task',
        state: 'In Progress',
        readinessPercent: 6000,
        plannedDev: 480,
        plannedTest: 120,
        plannedMgmt: 60,
        actualDev: 240,
        actualTest: 60,
        actualMgmt: 30,
        totalPlanned: 660,
        totalActual: 330,
        remaining: 330,
        baseAmount: 100000,
        managerAmount: 50000,
        businessAmount: 25000,
        totalOnHand: 175000,
        ndfl: 22750,
        insurance: 52500,
        reserveVacation: 14583,
        totalWithTax: 264833,
      },
    ];

    const headers = [
      'Issue',
      'Summary',
      'State',
      'Readiness %',
      'Planned Dev',
      'Planned Test',
      'Planned Mgmt',
      'Actual Dev',
      'Actual Test',
      'Actual Mgmt',
      'Total Planned',
      'Total Actual',
      'Remaining',
      'Base Amount',
      'Manager Amount',
      'Business Amount',
      'Total On Hand',
      'NDFL',
      'Insurance',
      'Reserve Vacation',
      'Total With Tax',
    ];

    const dataRows = rows.map((r) => [
      r.issueNumber,
      r.summary,
      r.state,
      (r.readinessPercent / 100).toFixed(1),
      formatMinutes(r.plannedDev),
      formatMinutes(r.plannedTest),
      formatMinutes(r.plannedMgmt),
      formatMinutes(r.actualDev),
      formatMinutes(r.actualTest),
      formatMinutes(r.actualMgmt),
      formatMinutes(r.totalPlanned),
      formatMinutes(r.totalActual),
      formatMinutes(r.remaining),
      formatKopecks(r.baseAmount),
      formatKopecks(r.managerAmount),
      formatKopecks(r.businessAmount),
      formatKopecks(r.totalOnHand),
      formatKopecks(r.ndfl),
      formatKopecks(r.insurance),
      formatKopecks(r.reserveVacation),
      formatKopecks(r.totalWithTax),
    ]);

    if (this.exceljsAvailable) {
      return await this.generateXlsx('Personal Report', [
        { name: 'Personal', headers, rows: dataRows },
      ]);
    }
    return generateCsv(headers, dataRows);
  }

  async exportAuditLog(params: {
    periodId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Buffer> {
    const rows: AuditLogRow[] = [
      {
        timestamp: new Date().toISOString(),
        userId: 'user-1',
        action: 'LOGIN',
        entityType: 'User',
        entityId: 'user-1',
        details: '{}',
        ipAddress: '127.0.0.1',
      },
    ];

    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Details',
      'IP Address',
    ];

    const dataRows = rows.map((r) => [
      r.timestamp,
      r.userId,
      r.action,
      r.entityType,
      r.entityId,
      r.details,
      r.ipAddress,
    ]);

    if (this.exceljsAvailable) {
      return await this.generateXlsx('Audit Log', [
        { name: 'Audit', headers, rows: dataRows },
      ]);
    }
    return generateCsv(headers, dataRows);
  }

  async exportJsonAccounting(periodId: string): Promise<Buffer> {
    const accountingData: AccountingJson = {
      period: {
        id: periodId,
        month: 1,
        year: 2025,
      },
      employees: [
        {
          userId: 'user-1',
          fullName: 'John Doe',
          tasks: [
            {
              issueNumber: 'PROJ-1',
              summary: 'Implementation task',
              hours: 8.5,
              cost: 85000,
            },
          ],
          totalHours: 8.5,
          totalCost: 85000,
        },
      ],
      totals: {
        totalHours: 8.5,
        totalCost: 85000,
        employeeCount: 1,
      },
    };

    // JSON export returns the JSON content as a Buffer
    return Buffer.from(JSON.stringify(accountingData, null, 2), 'utf8');
  }

  // ─── ExcelJS Generation ───

  private async generateXlsx(
    title: string,
    sheets: Array<{ name: string; headers: string[]; rows: unknown[][] }>,
  ): Promise<Buffer> {
    const Workbook = this.exceljs.Workbook;
    const workbook = new Workbook();

    workbook.creator = 'SPO Export System';
    workbook.created = new Date();

    for (const sheetDef of sheets) {
      const worksheet = workbook.addWorksheet(sheetDef.name, {
        properties: {
          tabColor: {
            argb: 'FF4472C4',
          },
        },
      });

      // ─── Title row ───
      worksheet.mergeCells(1, 1, 1, sheetDef.headers.length);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = title;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // ─── Header row ───
      const headerRow = worksheet.getRow(2);
      sheetDef.headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF305496' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        };
      });
      headerRow.height = 25;

      // ─── Data rows ───
      sheetDef.rows.forEach((rowData, rowIndex) => {
        const row = worksheet.getRow(rowIndex + 3);
        rowData.forEach((value, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          cell.value = value;
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };

          // Alternate row color
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F7FB' },
            };
          }
        });
        row.height = 20;
      });

      // ─── Auto-fit column widths ───
      sheetDef.headers.forEach((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...sheetDef.rows.map((r) => String(r[index] ?? '').length),
        );
        worksheet.getColumn(index + 1).width = Math.min(Math.max(maxLength + 3, 12), 50);
      });

      // ─── Freeze panes ───
      worksheet.autoFilter = {
        from: { row: 2, column: 1 },
        to: { row: 1 + sheetDef.rows.length, column: sheetDef.headers.length },
      };
      worksheet.views = [{ state: 'frozen', ySplit: 2 }];
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }
}
