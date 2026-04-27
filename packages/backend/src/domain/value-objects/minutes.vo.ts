/**
 * Minutes Value Object
 *
 * Хранит время в минутах (целое число) — запрещено использовать Float.
 * Все расчёты времени должны проходить через этот Value Object.
 *
 * @example
 * ```typescript
 * const hours = Minutes.fromHours(2.5); // 150 минут
 * hours.toHours(); // 2.5
 * hours.add(otherMinutes);
 * ```
 */
export class Minutes {
  private constructor(private readonly _minutes: number) {
    if (!Number.isInteger(_minutes)) {
      throw new Error(`Minutes must be an integer number. Got: ${_minutes}`);
    }
  }

  /** Создать из минут */
  static fromMinutes(minutes: number): Minutes {
    return new Minutes(minutes);
  }

  /** Создать из часов (с округлением до минут) */
  static fromHours(hours: number): Minutes {
    const minutes = Math.round(hours * 60);
    return new Minutes(minutes);
  }

  /** Создать из рабочих дней (8-часовой рабочий день) */
  static fromWorkDays(days: number): Minutes {
    return new Minutes(days * 8 * 60);
  }

  /** Нулевое значение */
  static zero(): Minutes {
    return new Minutes(0);
  }

  // ─── Геттеры ───

  /** Количество минут */
  get minutes(): number {
    return this._minutes;
  }

  /** Количество часов (с округлением до 2 знаков) */
  get hours(): number {
    return Math.round((this._minutes / 60) * 100) / 100;
  }

  /** Количество рабочих дней (8-часовые) */
  get workDays(): number {
    return Math.round((this._minutes / (8 * 60)) * 100) / 100;
  }

  /** Является ли нулём */
  get isZero(): boolean {
    return this._minutes === 0;
  }

  /** Является ли положительным */
  get isPositive(): boolean {
    return this._minutes > 0;
  }

  /** Является ли отрицательным */
  get isNegative(): boolean {
    return this._minutes < 0;
  }

  /** Абсолютное значение */
  get absolute(): Minutes {
    return new Minutes(Math.abs(this._minutes));
  }

  // ─── Арифметика ───

  /** Сложение */
  add(other: Minutes): Minutes {
    return new Minutes(this._minutes + other._minutes);
  }

  /** Вычитание */
  subtract(other: Minutes): Minutes {
    return new Minutes(this._minutes - other._minutes);
  }

  /** Умножение на целое число */
  multiply(factor: number): Minutes {
    if (!Number.isInteger(factor)) {
      throw new Error(`Minutes multiplication factor must be an integer. Got: ${factor}`);
    }
    return new Minutes(this._minutes * factor);
  }

  /** Умножение на дробное число (с округлением) */
  multiplyBy(factor: number): Minutes {
    return new Minutes(Math.round(this._minutes * factor));
  }

  /** Деление на целое число (с округлением вниз) */
  divide(divisor: number): Minutes {
    if (!Number.isInteger(divisor) || divisor === 0) {
      throw new Error(`Minutes division divisor must be a non-zero integer. Got: ${divisor}`);
    }
    return new Minutes(Math.floor(this._minutes / divisor));
  }

  /** Деление на дробное число (с округлением) */
  divideBy(divisor: number): Minutes {
    if (divisor === 0) {
      throw new Error('Cannot divide Minutes by zero');
    }
    return new Minutes(Math.round(this._minutes / divisor));
  }

  /** Процент от времени (percent в basis points: 1000 = 10%) */
  percent(basisPoints: number): Minutes {
    if (!Number.isInteger(basisPoints)) {
      throw new Error(`Basis points must be an integer. Got: ${basisPoints}`);
    }
    return new Minutes(Math.round((this._minutes * basisPoints) / 10000));
  }

  /** Разница в процентах между двумя значениями в basis points */
  percentDiff(other: Minutes): number {
    if (this._minutes === 0) {
      throw new Error('Cannot calculate percent diff from zero minutes');
    }
    return Math.round(((other._minutes - this._minutes) / this._minutes) * 10000);
  }

  // ─── Сравнение ───

  equals(other: Minutes): boolean {
    return this._minutes === other._minutes;
  }

  greaterThan(other: Minutes): boolean {
    return this._minutes > other._minutes;
  }

  greaterThanOrEqual(other: Minutes): boolean {
    return this._minutes >= other._minutes;
  }

  lessThan(other: Minutes): boolean {
    return this._minutes < other._minutes;
  }

  lessThanOrEqual(other: Minutes): boolean {
    return this._minutes <= other._minutes;
  }

  // ─── Сериализация ───

  /** Для сохранения в БД (минуты) */
  toJSON(): number {
    return this._minutes;
  }

  /** Читабельное представление */
  toString(): string {
    const h = Math.floor(this._minutes / 60);
    const m = this._minutes % 60;
    if (h > 0 && m > 0) return `${h}ч ${m}м`;
    if (h > 0) return `${h}ч`;
    return `${m}м`;
  }
}
