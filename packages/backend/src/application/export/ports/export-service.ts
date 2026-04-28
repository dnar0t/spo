/**
 * IExportService Interface (Application Layer Port)
 *
 * Порт для генераторов экспорта (Excel, PDF, JSON).
 * Определяет контракт, который должны реализовать инфраструктурные сервисы.
 */

export interface IExportService {
  /** Экспорт плана периода */
  exportPlan(periodId: string): Promise<Buffer>;

  /** Экспорт сводного отчёта периода */
  exportSummaryReport(periodId: string): Promise<Buffer>;

  /** Экспорт личного отчёта сотрудника */
  exportPersonalReport(periodId: string, userId: string): Promise<Buffer>;

  /** Экспорт аудит-лога с фильтрацией */
  exportAuditLog(params: {
    periodId?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Buffer>;

  /** Экспорт JSON для бухгалтерии */
  exportJsonAccounting(periodId: string): Promise<Buffer>;
}
