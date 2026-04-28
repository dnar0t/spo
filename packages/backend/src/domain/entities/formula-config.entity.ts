/**
 * FormulaConfig Entity (Domain Layer)
 *
 * Сущность конфигурации формулы (налоговая ставка, процент резерва и т.д.).
 * Значения хранятся в basis points (1% = 100 basis points).
 */
export class FormulaConfig {
  constructor(
    private readonly _id: string,
    private _name: string,
    private _formulaType: 'NDFL' | 'INSURANCE' | 'VACATION_RESERVE' | 'OTHER',
    private _value: number, // в basis points
    private _isActive: boolean = true,
    private _description: string | null,
    private _version: number = 1,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get formulaType(): string {
    return this._formulaType;
  }

  get value(): number {
    return this._value;
  }

  get valuePercent(): number {
    return this._value / 100;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get description(): string | null {
    return this._description;
  }

  get version(): number {
    return this._version;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /** Активировать формулу */
  activate(): void {
    if (this._isActive) {
      throw new Error('Formula is already active');
    }
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /** Деактивировать формулу */
  deactivate(): void {
    if (!this._isActive) {
      throw new Error('Formula is already inactive');
    }
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /** Обновить значение и увеличить версию */
  updateValue(newValueBasisPoints: number, reason?: string): void {
    if (newValueBasisPoints < 0) {
      throw new Error('Formula value must be non-negative');
    }
    if (newValueBasisPoints > 100000) {
      throw new Error('Formula value cannot exceed 100000 basis points (1000%)');
    }

    if (this._value === newValueBasisPoints) {
      throw new Error('New value is the same as current value');
    }

    this._value = newValueBasisPoints;
    this._version += 1;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    name: string;
    formulaType: 'NDFL' | 'INSURANCE' | 'VACATION_RESERVE' | 'OTHER';
    value: number; // в basis points
    description?: string | null;
  }): FormulaConfig {
    if (params.value < 0) {
      throw new Error('Formula value must be non-negative');
    }

    return new FormulaConfig(
      params.id ?? crypto.randomUUID(),
      params.name,
      params.formulaType,
      params.value,
      true,
      params.description ?? null,
      1,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    name: string;
    formulaType: string;
    value: number;
    isActive: boolean;
    description: string | null;
    version?: number;
    createdAt: Date;
    updatedAt: Date;
  }): FormulaConfig {
    return new FormulaConfig(
      data.id,
      data.name,
      data.formulaType as 'NDFL' | 'INSURANCE' | 'VACATION_RESERVE' | 'OTHER',
      data.value,
      data.isActive,
      data.description,
      data.version ?? 1,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      name: this._name,
      formula_type: this._formulaType,
      value: this._value,
      is_active: this._isActive,
      description: this._description,
      version: this._version,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
