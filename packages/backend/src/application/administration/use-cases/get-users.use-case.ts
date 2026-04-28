/**
 * GetUsersUseCase
 *
 * Use case для получения списка пользователей с пагинацией и фильтрацией.
 */
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UserResponseDto } from '../dto/user-response.dto';

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GetUsersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: GetUsersQuery): Promise<PaginatedResult<UserResponseDto>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const allUsers = await this.userRepository.findAll();

    // Фильтрация
    let filtered = allUsers;

    if (query.isActive !== undefined) {
      filtered = filtered.filter(u => u.isActive === query.isActive);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.login?.toLowerCase().includes(searchLower)) ||
        (u.email?.toLowerCase().includes(searchLower)) ||
        (u.fullName?.toLowerCase().includes(searchLower))
      );
    }

    // Сортировка по дате создания (последние сверху)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Пагинация
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems.map(user => ({
        id: user.id,
        login: user.login,
        email: user.email,
        fullName: user.fullName,
        roles: [],
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
