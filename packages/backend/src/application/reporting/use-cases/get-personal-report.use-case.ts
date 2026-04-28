/**
 * GetPersonalReportUseCase
 *
 * Получение личного отчёта сотрудника за период.
 * - Проверяет ABAC права (canViewPersonalReport)
 * - Поддерживает получение своего отчёта (/me) и чужого (/personal/:userId)
 */
import { PersonalReportRepository } from '../../../domain/repositories/personal-report.repository';
import { ReportingPeriodRepository } from '../../../domain/repositories/reporting-period.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { AccessControlService, AccessContext } from '../../../domain/services/access-control.service';
import { NotFoundError, UnauthorizedError } from '../../../domain/errors/domain.error';
import { PersonalReportDto, PersonalReportLineDto, PersonalReportTotalsDto } from '../dto/personal-report.dto';

export interface GetPersonalReportParams {
  periodId: string;
  targetUserId: string;
  viewerId: string;
  viewerRoles: string[];
  isManagerOf?: (employeeId: string) => boolean | Promise<boolean>;
}

export class GetPersonalReportUseCase {
  constructor(
    private readonly reportingPeriodRepository: ReportingPeriodRepository,
    private readonly personalReportRepository: PersonalReportRepository,
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
  ) {}

  async execute(params: GetPersonalReportParams): Promise<PersonalReportDto> {
    const { periodId, targetUserId, viewerId, viewerRoles, isManagerOf } = params;

    // 1. Проверяем, что период существует
    const period = await this.reportingPeriodRepository.findById(periodId);
    if (!period) {
      throw new NotFoundError('ReportingPeriod', periodId);
    }

    // 2. Проверяем ABAC права
    const context: AccessContext = {
      userId: viewerId,
      userRoles: viewerRoles,
      isManagerOf,
    };

    const canView = this.accessControlService.canViewPersonalReport(
      viewerId,
      targetUserId,
      context,
    );

    if (!canView) {
      throw new UnauthorizedError(
        'You do not have permission to view this personal report',
      );
    }

    // 3. Получаем данные пользователя
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User', targetUserId);
    }

    // 4. Получаем строки личного отчёта
    const personalReports = await this.personalReportRepository.findByPeriodAndUserId(
      periodId,
      targetUserId,
    );

    // 5. Формируем DTO
    const lines = personalReports.map(PersonalReportLineDto.fromDomain);
    const totals = PersonalReportTotalsDto.fromDomain(personalReports);

    return PersonalReportDto.fromDomain({
      userId: targetUserId,
      fullName: targetUser.fullName,
      periodId,
      lines,
      totals,
    });
  }
}
