/**
 * Money Value Object
 *
 * Хранит деньги в копейках (целое число) — запрещено использовать Float.
 * Все финансовые расчёты должны проходить через этот Value Object.
 *
 * @example
 * ```typescript
 * const price = Money.fromRubles(1500); // 1500 руб. = 150000 коп.
 * price.toRubles(); // 1500
 * price.add(otherMoney);
 * ```
 */
export class Money {
  private constructor(private readonly _kopecks: number) {
    if (!Number.isInteger(_kopecks)) {
      throw new Error(`Money must be an integer number of kopecks. Got: ${_kopecks}`);
    }
  }

  /** Создать из копеек (целое число) */
  static fromKopecks(kopecks: number): Money {
    return new Money(kopecks);
  }

  /** Создать из рублей (с округлением до копеек) */
  static fromRubles(rubles: number): Money {
    const kopecks = Math.round(rubles * 100);
    return new Money(kopecks);
  }

  /** Нулевая сумма */
  static zero(): Money {
    return new Money(0);
  }

  // ─── Геттеры ───

  /** Количество копеек */
  get kopecks(): number {
    return this._kopecks;
  }

  /** Количество рублей (с округлением до 2 знаков) */
  get rubles(): number {
    return Math.round(this._kopecks) / 100;
  }

  /** Является ли нулём */
  get isZero(): boolean {
    return this._kopecks === 0;
  }

  /** Является ли положительным */
  get isPositive(): boolean {
    return this._kopecks > 0;
  }

  /** Является ли отрицательным */
  get isNegative(): boolean {
    return this._kopecks < 0;
  }

  /** Абсолютное значение */
  get absolute(): Money {
    return new Money(Math.abs(this._kopecks));
  }

  // ─── Арифметика ───

  /** Сложение */
  add(other: Money): Money {
    return new Money(this._kopecks + other._kopecks);
  }

  /** Вычитание */
  subtract(other: Money): Money {
    return new Money(this._kopecks - other._kopecks);
  }

  /** Умножение на целое число */
  multiply(factor: number): Money {
    if (!Number.isInteger(factor)) {
      throw new Error(`Money multiplication factor must be an integer. Got: ${factor}`);
    }
    return new Money(this._kopecks * factor);
  }

  /** Умножение на дробное число (с округлением) */
  multiplyBy(factor: number): Money {
    return new Money(Math.round(this._kopecks * factor));
  }

  /** Деление на целое число (с округлением вниз) */
  divide(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor === 0) {
      throw new Error(`Money division divisor must be a non-zero integer. Got: ${divisor}`);
    }
    return new Money(Math.floor(this._kopecks / divisor));
  }

  /** Деление на дробное число (с округлением) */
  divideBy(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide Money by zero');
    }
    return new Money(Math.round(this._kopecks / divisor));
  }

  /** Процент от суммы (percent в basis points: 1000 = 10%) */
  percent(basisPoints: number): Money {
    if (!Number.isInteger(basisPoints)) {
      throw new Error(`Basis points must be an integer. Got: ${basisPoints}`);
    }
    // (kopecks * basisPoints) / 10000
    return new Money(Math.round((this._kopecks * basisPoints) / 10000));
  }

  // ─── Сравнение ───

  equals(other: Money): boolean {
    return this._kopecks === other._kopecks;
  }

  greaterThan(other: Money): boolean {
    return this._kopecks > other._kopecks;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this._kopecks >= other._kopecks;
  }

  lessThan(other: Money): boolean {
    return this._kopecks < other._kopecks;
  }

  lessThanOrEqual(other: Money): boolean {
    return this._kopecks <= other._kopecks;
  }

  // ─── Сериализация ───

  /** Для сохранения в БД (копейки) */
  toJSON(): number {
    return this._kopecks;
  }

  /** Читабельное представление */
  toString(): string {
    return `${this.rubles.toFixed(2)} ₽`;
  }
}
