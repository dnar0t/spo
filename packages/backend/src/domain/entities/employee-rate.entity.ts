/**
 * EmployeeRate Entity (Domain Layer)
 *
 * Сущность ставки сотрудника (EmployeeRateHistory).
 * Хранит информацию о месячной зарплате, годовых часах и часовой ставке.
 * Все финансовые значения — в копейках, время — в минутах.
 */
import { Money } from '../value-objects/money.vo';
import { HourlyRate } from '../value-objects/hourly-rate.vo';

export class EmployeeRate {
  constructor(
    private readonly _id: string,
    private _userId: string,
    private _monthlySalary: Money,
    private _annualHours: number, // в минутах
    private _hourlyRate: HourlyRate,
    private _effectiveFrom: Date,
    private _effectiveTo: Date | null,
    private _changedById: string,
    private _changeReason: string | null,
    private readonly _createdAt: Date = new Date(),
  ) {}

  // ─── Геттеры ───

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get monthlySalary(): Money {
    return this._monthlySalary;
  }

  get annualHours(): number {
    return this._annualHours;
  }

  get hourlyRate(): HourlyRate {
    return this._hourlyRate;
  }

  get effectiveFrom(): Date {
    return this._effectiveFrom;
  }

  get effectiveTo(): Date | null {
    return this._effectiveTo;
  }

  get changedById(): string {
    return this._changedById;
  }

  get changeReason(): string | null {
    return this._changeReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // ─── Бизнес-правила ───

  /** Проверить, активна ли ставка на указанную дату */
  isEffective(date: Date): boolean {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const fromDate = new Date(this._effectiveFrom);
    fromDate.setHours(0, 0, 0, 0);

    if (normalizedDate < fromDate) return false;

    if (this._effectiveTo) {
      const toDate = new Date(this._effectiveTo);
      toDate.setHours(0, 0, 0, 0);
      return normalizedDate <= toDate;
    }

    return true;
  }

  /** Деактивировать ставку (закрыть период действия) */
  deactivate(untilDate: Date): void {
    if (this._effectiveTo) {
      throw new Error('Rate is already deactivated');
    }
    if (untilDate <= this._effectiveFrom) {
      throw new Error('Deactivation date must be after effective from date');
    }
    this._effectiveTo = untilDate;
  }

  // ─── Фабричный метод ───

  static create(params: {
    id?: string;
    userId: string;
    monthlySalary: Money;
    annualHours: number; // в минутах
    effectiveFrom: Date;
    changedById: string;
    changeReason?: string | null;
  }): EmployeeRate {
    if (params.annualHours <= 0) {
      throw new Error('Annual hours must be positive');
    }

    const hourlyRate = HourlyRate.fromMonthlyAndAnnualHours(
      params.monthlySalary.kopecks,
      params.annualHours,
    );

    return new EmployeeRate(
      params.id ?? crypto.randomUUID(),
      params.userId,
      params.monthlySalary,
      params.annualHours,
      hourlyRate,
      params.effectiveFrom,
      null,
      params.changedById,
      params.changeReason ?? null,
      new Date(),
    );
  }

  // ─── Сериализация ───

  static fromPersistence(data: {
    id: string;
    userId: string;
    monthlySalary: number;
    annualMinutes: number;
    hourlyRate: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    changedById: string;
    changeReason: string | null;
    createdAt: Date;
  }): EmployeeRate {
    return new EmployeeRate(
      data.id,
      data.userId,
      Money.fromKopecks(data.monthlySalary),
      data.annualMinutes,
      HourlyRate.fromKopecksPerHour(data.hourlyRate),
      data.effectiveFrom,
      data.effectiveTo,
      data.changedById,
      data.changeReason,
      data.createdAt,
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      user_id: this._userId,
      monthly_salary: this._monthlySalary.kopecks,
      annual_minutes: this._annualHours,
      hourly_rate: this._hourlyRate.kopecksPerHour,
      effective_from: this._effectiveFrom,
      effective_to: this._effectiveTo,
      changed_by_id: this._changedById,
      change_reason: this._changeReason,
      created_at: this._createdAt,
    };
  }
}
