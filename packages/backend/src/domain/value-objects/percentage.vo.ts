/**
 * Percentage Value Object
 *
 * Хранит проценты в basis points (целое число) — запрещено использовать Float.
 * 1% = 100 basis points, 100% = 10000 basis points.
 *
 * @example
 * ```typescript
 * const pct = Percentage.fromPercent(12.5); // 1250 basis points
 * pct.toPercent(); // 12.5
 * pct.basisPoints; // 1250
 * ```
 */
export class Percentage {
  private constructor(private readonly _basisPoints: number) {
    if (!Number.isInteger(_basisPoints)) {
      throw new Error(
        `Percentage must be an integer number of basis points. Got: ${_basisPoints}`,
      );
    }
  }

  /** Создать из процентов (12.5% = 1250 basis points) */
  static fromPercent(percent: number): Percentage {
    return new Percentage(Math.round(percent * 100));
  }

  /** Создать из basis points (1250 = 12.5%) */
  static fromBasisPoints(basisPoints: number): Percentage {
    return new Percentage(basisPoints);
  }

  /** Нулевое значение (0%) */
  static zero(): Percentage {
    return new Percentage(0);
  }

  /** 100% (полное значение) */
  static hundred(): Percentage {
    return new Percentage(10000);
  }

  // ─── Геттеры ───

  /** Количество basis points */
  get basisPoints(): number {
    return this._basisPoints;
  }

  /** Проценты (1250 → 12.5) */
  get percent(): number {
    return this._basisPoints / 100;
  }

  /** Десятичная дробь (1250 → 0.125) */
  get decimal(): number {
    return this._basisPoints / 10000;
  }

  /** Является ли нулём */
  get isZero(): boolean {
    return this._basisPoints === 0;
  }

  /** Является ли положительным */
  get isPositive(): boolean {
    return this._basisPoints > 0;
  }

  /** Является ли отрицательным */
  get isNegative(): boolean {
    return this._basisPoints < 0;
  }

  /** Является ли 100% */
  get isFull(): boolean {
    return this._basisPoints >= 10000;
  }

  // ─── Арифметика ───

  /** Сложение */
  add(other: Percentage): Percentage {
    return new Percentage(this._basisPoints + other._basisPoints);
  }

  /** Вычитание */
  subtract(other: Percentage): Percentage {
    return new Percentage(this._basisPoints - other._basisPoints);
  }

  /** Умножение на целое число */
  multiply(factor: number): Percentage {
    if (!Number.isInteger(factor)) {
      throw new Error(`Multiplication factor must be an integer. Got: ${factor}`);
    }
    return new Percentage(this._basisPoints * factor);
  }

  /** Деление на целое число */
  divide(divisor: number): Percentage {
    if (!Number.isInteger(divisor) || divisor === 0) {
      throw new Error(`Division divisor must be a non-zero integer. Got: ${divisor}`);
    }
    return new Percentage(Math.floor(this._basisPoints / divisor));
  }

  /** Применить процент к числу (копейки/минуты) — возвращает целое число */
  applyTo(value: number): number {
    return Math.round((value * this._basisPoints) / 10000);
  }

  /** Посчитать, какой процент составляет часть от целого (в basis points) */
  static calculatePercentage(part: number, total: number): Percentage {
    if (total === 0) {
      throw new Error('Cannot calculate percentage with total = 0');
    }
    return new Percentage(Math.round((part / total) * 10000));
  }

  // ─── Сравнение ───

  equals(other: Percentage): boolean {
    return this._basisPoints === other._basisPoints;
  }

  greaterThan(other: Percentage): boolean {
    return this._basisPoints > other._basisPoints;
  }

  greaterThanOrEqual(other: Percentage): boolean {
    return this._basisPoints >= other._basisPoints;
  }

  lessThan(other: Percentage): boolean {
    return this._basisPoints < other._basisPoints;
  }

  lessThanOrEqual(other: Percentage): boolean {
    return this._basisPoints <= other._basisPoints;
  }

  // ─── Сериализация ───

  /** Для сохранения в БД (basis points) */
  toJSON(): number {
    return this._basisPoints;
  }

  /** Читабельное представление */
  toString(): string {
    return `${this.percent.toFixed(2)}%`;
  }
}
