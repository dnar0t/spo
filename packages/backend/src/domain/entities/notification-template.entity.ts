/**
 * NotificationTemplate Entity (Domain Layer)
 *
 * Сущность шаблона уведомления.
 * Содержит subject и body с {{variable}} плейсхолдерами,
 * которые заменяются при рендеринге.
 */
import { InvalidArgumentError } from '../errors/domain.error';

export interface NotificationTemplateCreateParams {
  id?: string;
  eventName: string;
  subject: string;
  body: string;
  isActive?: boolean;
}

export interface NotificationTemplatePersistenceData {
  id: string;
  eventName: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  extensions?: Record<string, unknown> | null;
}

export class NotificationTemplate {
  private constructor(
    private readonly _id: string,
    private _eventName: string,
    private _subject: string,
    private _body: string,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.validate();
  }

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get eventName(): string {
    return this._eventName;
  }

  get subject(): string {
    return this._subject;
  }

  get body(): string {
    return this._body;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ─── Валидация ───

  private validate(): void {
    if (!this._eventName || this._eventName.trim().length === 0) {
      throw new InvalidArgumentError('eventName', 'Event name cannot be empty');
    }

    if (!this._subject || this._subject.trim().length === 0) {
      throw new InvalidArgumentError('subject', 'Subject cannot be empty');
    }

    if (!this._body || this._body.trim().length === 0) {
      throw new InvalidArgumentError('body', 'Body cannot be empty');
    }
  }

  // ─── Бизнес-методы ───

  /** Активировать шаблон */
  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /** Деактивировать шаблон */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /** Обновить шаблон */
  update(params: {
    eventName?: string;
    subject?: string;
    body?: string;
    isActive?: boolean;
  }): void {
    if (params.eventName !== undefined) this._eventName = params.eventName;
    if (params.subject !== undefined) this._subject = params.subject;
    if (params.body !== undefined) this._body = params.body;
    if (params.isActive !== undefined) this._isActive = params.isActive;

    this.validate();
    this._updatedAt = new Date();
  }

  /**
   * Рендеринг шаблона с подстановкой переменных.
   * Заменяет все вхождения {{variableName}} на соответствующие значения.
   *
   * @param variables - словарь переменных для подстановки
   * @returns объект с rendered subject и body
   */
  render(variables: Record<string, string>): { subject: string; body: string } {
    const renderTemplate = (template: string): string => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, variableName: string) => {
        if (variables[variableName] !== undefined) {
          return variables[variableName];
        }
        // Если переменная не найдена, оставляем плейсхолдер как есть
        return match;
      });
    };

    return {
      subject: renderTemplate(this._subject),
      body: renderTemplate(this._body),
    };
  }

  // ─── Фабричные методы ───

  /** Создать новый шаблон уведомления */
  static create(params: NotificationTemplateCreateParams): NotificationTemplate {
    return new NotificationTemplate(
      params.id ?? crypto.randomUUID(),
      params.eventName,
      params.subject,
      params.body,
      params.isActive ?? true,
      new Date(),
      new Date(),
    );
  }

  /** Восстановить из persistence (БД) */
  static fromPersistence(data: NotificationTemplatePersistenceData): NotificationTemplate {
    return new NotificationTemplate(
      data.id,
      data.eventName,
      data.subject,
      data.body,
      data.isActive,
      data.createdAt,
      data.updatedAt,
    );
  }

  /** Преобразовать для сохранения */
  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      eventName: this._eventName,
      subject: this._subject,
      body: this._body,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
