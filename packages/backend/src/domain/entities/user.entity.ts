/**
 * User Entity (Domain Layer)
 *
 * Корневая сущность пользователя системы.
 * Содержит бизнес-правила, связанные с пользователем.
 */
export class User {
  constructor(
    private readonly _id: string,
    private _login: string,
    private _email: string | null,
    private _fullName: string | null,
    private _youtrackLogin: string | null,
    private _youtrackUserId: string | null,
    private _adLogin: string | null,
    private _isActive: boolean = true,
    private _isBlocked: boolean = false,
    private _employmentDate: Date | null = null,
    private _terminationDate: Date | null = null,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private _deletedAt: Date | null = null,
    private _extensions: Record<string, unknown> | null = null,
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get login(): string {
    return this._login;
  }

  get email(): string | null {
    return this._email;
  }

  get fullName(): string | null {
    return this._fullName;
  }

  get youtrackLogin(): string | null {
    return this._youtrackLogin;
  }

  get youtrackUserId(): string | null {
    return this._youtrackUserId;
  }

  get adLogin(): string | null {
    return this._adLogin;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isBlocked(): boolean {
    return this._isBlocked;
  }

  get employmentDate(): Date | null {
    return this._employmentDate;
  }

  get terminationDate(): Date | null {
    return this._terminationDate;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get extensions(): Record<string, unknown> | null {
    return this._extensions;
  }

  // ─── Бизнес-правила ───

  /** Заблокировать пользователя */
  block(): void {
    if (this._isBlocked) {
      throw new Error('User is already blocked');
    }
    this._isBlocked = true;
    this._updatedAt = new Date();
  }

  /** Разблокировать пользователя */
  unblock(): void {
    if (!this._isBlocked) {
      throw new Error('User is not blocked');
    }
    this._isBlocked = false;
    this._updatedAt = new Date();
  }

  /** Деактивировать пользователя (soft delete) */
  deactivate(): void {
    if (!this._isActive) {
      throw new Error('User is already inactive');
    }
    this._isActive = false;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  /** Активировать пользователя */
  activate(): void {
    if (this._isActive) {
      throw new Error('User is already active');
    }
    this._isActive = true;
    this._deletedAt = null;
    this._updatedAt = new Date();
  }

  /** Установить дату увольнения */
  setTerminationDate(date: Date): void {
    this._terminationDate = date;
    this._updatedAt = new Date();
  }

  /** Обновить профиль */
  updateProfile(params: {
    email?: string | null;
    fullName?: string | null;
    youtrackLogin?: string | null;
    youtrackUserId?: string | null;
    adLogin?: string | null;
  }): void {
    if (params.email !== undefined) this._email = params.email;
    if (params.fullName !== undefined) this._fullName = params.fullName;
    if (params.youtrackLogin !== undefined) this._youtrackLogin = params.youtrackLogin;
    if (params.youtrackUserId !== undefined) this._youtrackUserId = params.youtrackUserId;
    if (params.adLogin !== undefined) this._adLogin = params.adLogin;
    this._updatedAt = new Date();
  }

  /** Проверка, может ли пользователь войти в систему */
  canLogin(): boolean {
    return this._isActive && !this._isBlocked && !this._deletedAt;
  }

  /** Проверка, уволен ли пользователь */
  isTerminated(): boolean {
    return this._terminationDate !== null && this._terminationDate <= new Date();
  }

  // ─── Фабричный метод ───

  /** Создать нового пользователя */
  static create(params: {
    id?: string;
    login: string;
    email?: string | null;
    fullName?: string | null;
    youtrackLogin?: string | null;
    youtrackUserId?: string | null;
    adLogin?: string | null;
    employmentDate?: Date | null;
  }): User {
    return new User(
      params.id ?? crypto.randomUUID(),
      params.login,
      params.email ?? null,
      params.fullName ?? null,
      params.youtrackLogin ?? null,
      params.youtrackUserId ?? null,
      params.adLogin ?? null,
      true,
      false,
      params.employmentDate ?? null,
      null,
      new Date(),
      new Date(),
      null,
      null,
    );
  }

  // ─── Сериализация ───

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: {
    id: string;
    login: string;
    email: string | null;
    fullName: string | null;
    youtrackLogin: string | null;
    youtrackUserId: string | null;
    adLogin: string | null;
    isActive: boolean;
    isBlocked: boolean;
    employmentDate: Date | null;
    terminationDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    extensions: Record<string, unknown> | null;
  }): User {
    return new User(
      data.id,
      data.login,
      data.email,
      data.fullName,
      data.youtrackLogin,
      data.youtrackUserId,
      data.adLogin,
      data.isActive,
      data.isBlocked,
      data.employmentDate,
      data.terminationDate,
      data.createdAt,
      data.updatedAt,
      data.deletedAt,
      data.extensions,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      login: this._login,
      email: this._email,
      full_name: this._fullName,
      youtrack_login: this._youtrackLogin,
      youtrack_user_id: this._youtrackUserId,
      ad_login: this._adLogin,
      is_active: this._isActive,
      is_blocked: this._isBlocked,
      employment_date: this._employmentDate,
      termination_date: this._terminationDate,
      created_at: this._createdAt,
      updated_at: this._updatedAt,
      deleted_at: this._deletedAt,
      extensions: this._extensions,
    };
  }
}
