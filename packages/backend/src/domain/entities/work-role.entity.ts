/**
 * WorkRole Entity (Domain Layer)
 *
 * Сущность рабочей роли сотрудника (разработка, тестирование, управление и т.д.).
 */
export class WorkRole {
  constructor(
    private readonly _id: string,
    private _name: string,
    private _description: string | null,
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

  get description(): string | null {
    return this._description;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  update(name: string, description?: string | null): void {
    this._name = name;
    if (description !== undefined) this._description = description;
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    name: string;
    description?: string | null;
  }): WorkRole {
    return new WorkRole(
      params.id ?? crypto.randomUUID(),
      params.name,
      params.description ?? null,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkRole {
    return new WorkRole(
      data.id,
      data.name,
      data.description,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
