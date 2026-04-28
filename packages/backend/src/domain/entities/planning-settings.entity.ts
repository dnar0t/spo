/**
 * PlanningSettings Entity (Domain Layer)
 *
 * Сущность настроек планирования по умолчанию.
 * Хранит значения процентов в basis points (1% = 100 basis points),
 * время в минутах.
 */
export class PlanningSettings {
  constructor(
    private readonly _id: string,
    private _workHoursPerMonth: number | null, // в минутах
    private _reservePercent: number | null, // basis points
    private _testPercent: number | null, // basis points
    private _debugPercent: number | null, // basis points
    private _mgmtPercent: number | null, // basis points
    private _yellowThreshold: number | null, // basis points
    private _redThreshold: number | null, // basis points
    private _businessGroupingLevel: string | null,
    private _updatedBy: string,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get workHoursPerMonth(): number | null {
    return this._workHoursPerMonth;
  }

  get reservePercent(): number | null {
    return this._reservePercent;
  }

  get testPercent(): number | null {
    return this._testPercent;
  }

  get debugPercent(): number | null {
    return this._debugPercent;
  }

  get mgmtPercent(): number | null {
    return this._mgmtPercent;
  }

  get yellowThreshold(): number | null {
    return this._yellowThreshold;
  }

  get redThreshold(): number | null {
    return this._redThreshold;
  }

  get businessGroupingLevel(): string | null {
    return this._businessGroupingLevel;
  }

  get updatedBy(): string {
    return this._updatedBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /** Обновить настройки */
  update(params: {
    workHoursPerMonth?: number | null;
    reservePercent?: number | null;
    testPercent?: number | null;
    debugPercent?: number | null;
    mgmtPercent?: number | null;
    yellowThreshold?: number | null;
    redThreshold?: number | null;
    businessGroupingLevel?: string | null;
    updatedBy: string;
  }): void {
    if (params.workHoursPerMonth !== undefined) {
      if (params.workHoursPerMonth !== null && params.workHoursPerMonth < 0) {
        throw new Error('Work hours per month must be non-negative');
      }
      this._workHoursPerMonth = params.workHoursPerMonth;
    }

    if (params.reservePercent !== undefined) {
      if (params.reservePercent !== null && (params.reservePercent < 0 || params.reservePercent > 10000)) {
        throw new Error('Reserve percent must be between 0 and 10000 basis points (0-100%)');
      }
      this._reservePercent = params.reservePercent;
    }

    if (params.testPercent !== undefined) {
      if (params.testPercent !== null && (params.testPercent < 0 || params.testPercent > 10000)) {
        throw new Error('Test percent must be between 0 and 10000 basis points (0-100%)');
      }
      this._testPercent = params.testPercent;
    }

    if (params.debugPercent !== undefined) {
      if (params.debugPercent !== null && (params.debugPercent < 0 || params.debugPercent > 10000)) {
        throw new Error('Debug percent must be between 0 and 10000 basis points (0-100%)');
      }
      this._debugPercent = params.debugPercent;
    }

    if (params.mgmtPercent !== undefined) {
      if (params.mgmtPercent !== null && (params.mgmtPercent < 0 || params.mgmtPercent > 10000)) {
        throw new Error('Management percent must be between 0 and 10000 basis points (0-100%)');
      }
      this._mgmtPercent = params.mgmtPercent;
    }

    if (params.yellowThreshold !== undefined) {
      if (params.yellowThreshold !== null && (params.yellowThreshold < 0 || params.yellowThreshold > 10000)) {
        throw new Error('Yellow threshold must be between 0 and 10000 basis points (0-100%)');
      }
      this._yellowThreshold = params.yellowThreshold;
    }

    if (params.redThreshold !== undefined) {
      if (params.redThreshold !== null && (params.redThreshold < 0 || params.redThreshold > 10000)) {
        throw new Error('Red threshold must be between 0 and 10000 basis points (0-100%)');
      }
      this._redThreshold = params.redThreshold;
    }

    if (params.businessGroupingLevel !== undefined) {
      this._businessGroupingLevel = params.businessGroupingLevel;
    }

    this._updatedBy = params.updatedBy;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    workHoursPerMonth?: number | null;
    reservePercent?: number | null;
    testPercent?: number | null;
    debugPercent?: number | null;
    mgmtPercent?: number | null;
    yellowThreshold?: number | null;
    redThreshold?: number | null;
    businessGroupingLevel?: string | null;
    updatedBy: string;
  }): PlanningSettings {
    return new PlanningSettings(
      params.id ?? crypto.randomUUID(),
      params.workHoursPerMonth ?? null,
      params.reservePercent ?? null,
      params.testPercent ?? null,
      params.debugPercent ?? null,
      params.mgmtPercent ?? null,
      params.yellowThreshold ?? null,
      params.redThreshold ?? null,
      params.businessGroupingLevel ?? null,
      params.updatedBy,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    workHoursPerMonth: number | null;
    reservePercent: number | null;
    testPercent: number | null;
    debugPercent: number | null;
    mgmtPercent: number | null;
    yellowThreshold: number | null;
    redThreshold: number | null;
    businessGroupingLevel: string | null;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): PlanningSettings {
    return new PlanningSettings(
      data.id,
      data.workHoursPerMonth,
      data.reservePercent,
      data.testPercent,
      data.debugPercent,
      data.mgmtPercent,
      data.yellowThreshold,
      data.redThreshold,
      data.businessGroupingLevel,
      data.updatedBy,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      work_hours_per_month: this._workHoursPerMonth,
      reserve_percent: this._reservePercent,
      test_percent: this._testPercent,
      debug_percent: this._debugPercent,
      mgmt_percent: this._mgmtPercent,
      yellow_threshold: this._yellowThreshold,
      red_threshold: this._redThreshold,
      business_grouping_level: this._businessGroupingLevel,
      updated_by: this._updatedBy,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
