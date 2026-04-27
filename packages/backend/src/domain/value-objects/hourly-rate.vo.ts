/**
 * HourlyRate Value Object
 *
 * Хранит часовую ставку в копейках за минуту * 60 (целое число).
 * Все расчёты ставок должны проходить через этот Value Object.
 *
 * @example
 * ```typescript
 * // Ставка 1500 руб/час = 150000 копеек/час
 * const rate = HourlyRate.fromKopecksPerHour(150000);
 * rate.toRublesPerHour(); // 1500
 * ```
 */
export class HourlyRate {
  private constructor(private readonly _kopecksPerHour: number) {
    if (!Number.isInteger(_kopecksPerHour)) {
      throw new Error(
        `HourlyRate must be an integer number of kopecks per hour. Got: ${_kopecksPerHour}`,
      );
    }
  }

  /** Создать из копеек в час */
  static fromKopecksPerHour(kopecksPerHour: number): HourlyRate {
    return new HourlyRate(kopecksPerHour);
  }

  /** Создать из рублей в час (с округлением до копеек) */
  static fromRublesPerHour(rublesPerHour: number): HourlyRate {
    return new HourlyRate(Math.round(rublesPerHour * 100));
  }

  /** Создать из месячной зарплаты и годового количества часов */
  static fromMonthlyAndAnnualHours(
    monthlySalaryKopecks: number,
    annualMinutes: number,
  ): HourlyRate {
    if (annualMinutes === 0) {
      throw new Error('Annual minutes cannot be zero');
    }
    // Месячная зарплата * 12 / годовые часы = ставка в копейках/час
    const annualSalaryKopecks = monthlySalaryKopecks * 12;
    const annualHours = annualMinutes / 60;
    const rate = Math.round(annualSalaryKopecks / annualHours);
    return new HourlyRate(rate);
  }

  /** Нулевая ставка */
  static zero(): HourlyRate {
    return new HourlyRate(0);
  }

  // ─── Геттеры ───

  /** Количество копеек в час */
  get kopecksPerHour(): number {
    return this._kopecksPerHour;
  }

  /** Количество рублей в час (с округлением до 2 знаков) */
  get rublesPerHour(): number {
    return Math.round(this._kopecksPerHour) / 100;
  }

  /** Количество копеек в минуту */
  get kopecksPerMinute(): number {
    return Math.round(this._kopecksPerHour / 60);
  }

  /** Является ли нулём */
  get isZero(): boolean {
    return this._kopecksPerHour === 0;
  }

  /** Является ли положительной */
  get isPositive(): boolean {
    return this._kopecksPerHour > 0;
  }

  // ─── Арифметика ───

  /** Сложение */
  add(other: HourlyRate): HourlyRate {
    return new HourlyRate(this._kopecksPerHour + other._kopecksPerHour);
  }

  /** Вычитание */
  subtract(other: HourlyRate): HourlyRate {
    return new HourlyRate(this._kopecksPerHour - other._kopecksPerHour);
  }

  /** Умножение на целое число */
  multiply(factor: number): HourlyRate {
    if (!Number.isInteger(factor)) {
      throw new Error(
        `HourlyRate multiplication factor must be an integer. Got: ${factor}`,
      );
    }
    return new HourlyRate(this._kopecksPerHour * factor);
  }

  /** Расчёт стоимости за N минут */
  costForMinutes(minutes: number): number {
    if (!Number.isInteger(minutes)) {
      throw new Error(`Minutes must be an integer. Got: ${minutes}`);
    }
    return Math.round((this._kopecksPerHour * minutes) / 60);
  }

  /** Расчёт стоимости за N часов (с плавающей точкой) */
  costForHours(hours: number): number {
    return Math.round(this._kopecksPerHour * hours);
  }

  // ─── Сравнение ───

  equals(other: HourlyRate): boolean {
    return this._kopecksPerHour === other._kopecksPerHour;
  }

  greaterThan(other: HourlyRate): boolean {
    return this._kopecksPerHour > other._kopecksPerHour;
  }

  lessThan(other: HourlyRate): boolean {
    return this._kopecksPerHour < other._kopecksPerHour;
  }

  // ─── Сериализация ───

  /** Для сохранения в БД (копейки в час) */
  toJSON(): number {
    return this._kopecksPerHour;
  }

  /** Читабельное представление */
  toString(): string {
    return `${this.rublesPerHour.toFixed(2)} ₽/час`;
  }
}
