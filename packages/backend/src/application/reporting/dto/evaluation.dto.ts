/**
 * EvaluationDto
 *
 * DTO для создания и обновления оценок (руководитель/бизнес).
 */

// ─── Запросы ───

export class CreateManagerEvaluationRequestDto {
  readonly periodId: string;
  readonly youtrackIssueId: string;
  readonly userId: string;
  readonly evaluationType: string;
  readonly percent?: number | null;
  readonly comment?: string | null;
}

export class UpdateManagerEvaluationRequestDto {
  readonly evaluationType?: string;
  readonly percent?: number | null;
  readonly comment?: string | null;
}

export class CreateBusinessEvaluationRequestDto {
  readonly periodId: string;
  readonly youtrackIssueId: string;
  readonly evaluationType: string;
  readonly percent?: number | null;
  readonly comment?: string | null;
}

export class UpdateBusinessEvaluationRequestDto {
  readonly evaluationType?: string;
  readonly percent?: number | null;
  readonly comment?: string | null;
}

// ─── Ответы ───

export class EvaluationResponseDto {
  readonly id: string;
  readonly periodId: string;
  readonly youtrackIssueId: string;
  readonly evaluationType: string;
  readonly percent: number | null;
  readonly comment: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  // Для ManagerEvaluation дополнительно
  readonly userId?: string;
  readonly evaluatedById?: string;

  constructor(data: EvaluationResponseDto) {
    Object.assign(this, data);
  }

  static fromManagerEvaluation(data: {
    id: string;
    periodId: string;
    youtrackIssueId: string;
    userId: string;
    evaluatedById: string;
    evaluationType: string;
    percent: number | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationResponseDto {
    return new EvaluationResponseDto({
      id: data.id,
      periodId: data.periodId,
      youtrackIssueId: data.youtrackIssueId,
      evaluationType: data.evaluationType,
      percent: data.percent !== null ? data.percent / 100 : null,
      comment: data.comment,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
      userId: data.userId,
      evaluatedById: data.evaluatedById,
    });
  }

  static fromBusinessEvaluation(data: {
    id: string;
    periodId: string;
    youtrackIssueId: string;
    evaluatedById: string;
    evaluationType: string;
    percent: number | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationResponseDto {
    return new EvaluationResponseDto({
      id: data.id,
      periodId: data.periodId,
      youtrackIssueId: data.youtrackIssueId,
      evaluationType: data.evaluationType,
      percent: data.percent !== null ? data.percent / 100 : null,
      comment: data.comment,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
      evaluatedById: data.evaluatedById,
    });
  }
}
