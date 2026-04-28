/**
 * EmployeeProfile Entity (Domain Layer)
 *
 * Сущность профиля сотрудника.
 * Содержит бизнес-правила, связанные с должностью, руководителем и плановыми часами.
 */
export class EmployeeProfile {
  constructor(
    private readonly _id: string,
    private _userId: string,
    private _workRoleId: string | null,
    private _managerId: string | null,
    private _plannedHoursPerYear: number | null, // в минутах
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get workRoleId(): string | null {
    return this._workRoleId;
  }

  get managerId(): string | null {
    return this._managerId;
  }

  get plannedHoursPerYear(): number | null {
    return this._plannedHoursPerYear;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Бизнес-правила ───

  /** Назначить рабочую роль */
  assignWorkRole(workRoleId: string): void {
    if (!workRoleId) {
      throw new Error('Work role ID is required');
    }
    this._workRoleId = workRoleId;
    this._updatedAt = new Date();
  }

  /** Назначить руководителя */
  assignManager(managerId: string | null): void {
    if (managerId && managerId === this._userId) {
      throw new Error('Employee cannot be their own manager');
    }
    this._managerId = managerId;
    this._updatedAt = new Date();
  }

  /** Обновить плановое количество часов в год */
  updatePlannedHours(hours: number): void {
    if (hours < 0) {
      throw new Error('Planned hours must be non-negative');
    }
    if (hours > 8760) {
      throw new Error('Planned hours cannot exceed 8760 (hours in a year)');
    }
    // Конвертируем часы в минуты
    this._plannedHoursPerYear = Math.round(hours * 60);
    this._updatedAt = new Date();
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    userId: string;
    workRoleId?: string | null;
    managerId?: string | null;
    plannedHoursPerYear?: number | null;
  }): EmployeeProfile {
    return new EmployeeProfile(
      params.id ?? crypto.randomUUID(),
      params.userId,
      params.workRoleId ?? null,
      params.managerId ?? null,
      params.plannedHoursPerYear !== undefined
        ? Math.round((params.plannedHoursPerYear ?? 0) * 60)
        : null,
      new Date(),
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    userId: string;
    workRoleId: string | null;
    managerId: string | null;
    plannedHoursPerYear: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmployeeProfile {
    return new EmployeeProfile(
      data.id,
      data.userId,
      data.workRoleId,
      data.managerId,
      data.plannedHoursPerYear,
      data.createdAt,
      data.updatedAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      user_id: this._userId,
      work_role_id: this._workRoleId,
      manager_id: this._managerId,
      planned_hours_per_year: this._plannedHoursPerYear,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
    };
  }
}
