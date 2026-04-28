/**
 * FormulaResponseDto
 *
 * DTO для ответа с данными о формуле.
 */
export class FormulaResponseDto {
  id: string;
  name: string;
  formulaType: string;
  value: number;        // в процентах (0-100)
  isActive: boolean;
  version: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
