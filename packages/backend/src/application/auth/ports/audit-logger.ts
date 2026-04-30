export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export interface IAuditLogger {
  log(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
}
