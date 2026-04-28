/**
 * EvaluationScale Entity (Domain Layer)
 *
 * Сущность шкалы оценок для Manager и Business оценок.
 * Хранит проценты в basis points (1% = 100 basis points).
 */
export class EvaluationScale {
  constructor(
    private readonly _id: string,
    private _scaleType: 'MANAGER' | 'BUSINESS',
    private _name: string,
    private _percent: number, // в basis points
    private _isDefault: boolean = false,
    private _sortOrder: number = 0,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get scaleType(): string {
    return this._scaleType;
  }

  get name(): string {
    return this._name;
  }

  get percent(): number {
    return this._percent;
  }

  get percentValue(): number {
    return this._percent / 100;
  }

  get isDefault(): boolean {
    return this._isDefault;
  }

  get sortOrder(): number {
    return this._sortOrder;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /** Установить как шкалу по умолчанию */
  setAsDefault(): void {
    if (this._isDefault) {
      throw new Error('Scale is already set as default');
    }
    this._isDefault = true;
    this._updatedAt = new Date();
  }

  /** Обновить название и процент шкалы */
  update(name?: string, percent?: number): void {
    if (name !== undefined) {
      if (!name.trim()) {
        throw new Error('Scale name cannot be empty');
      }
      this._name = name.trim();
    }

    if (percent !== undefined) {
      if (percent < 0) {
        throw new Error('Scale percent must be non-negative');
      }
      if (percent > 10000) {
        throw new Error('Scale percent cannot exceed 10000 basis points (100%)');
      }
      this._percent = percent;
    }

    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    scaleType: 'MANAGER' | 'BUSINESS';
    name: string;
    percent: number; // в basis points
    isDefault?: boolean;
    sortOrder?: number;
  }): EvaluationScale {
    if (!params.name.trim()) {
      throw new Error('Scale name cannot be empty');
    }
    if (params.percent < 0) {
      throw new Error('Scale percent must be non-negative');
    }
    if (params.percent > 10000) {
      throw new Error('Scale percent cannot exceed 10000 basis points (100%)');
    }

    return new EvaluationScale(
      params.id ?? crypto.randomUUID(),
      params.scaleType,
      params.name.trim(),
      params.percent,
      params.isDefault ?? false,
      params.sortOrder ?? 0,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    scaleType: string;
    name: string;
    percent: number;
    isDefault: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationScale {
    return new EvaluationScale(
      data.id,
      data.scaleType as 'MANAGER' | 'BUSINESS',
      data.name,
      data.percent,
      data.isDefault,
      data.sortOrder,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      scale_type: this._scaleType,
      name: this._name,
      percent: this._percent,
      is_default: this._isDefault,
      sort_order: this._sortOrder,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
