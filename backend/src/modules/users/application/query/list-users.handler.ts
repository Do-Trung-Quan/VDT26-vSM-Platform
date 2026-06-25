import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UserListItemDto } from '../dto/user-list-item.dto';
import { extractStorageKey } from '../command/create-user.handler';

export interface ListUsersResult {
  items: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListUsersHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
  ) {}

  async execute(query: ListUsersQueryDto): Promise<ListUsersResult> {
    const { items, total } = await this.userRepo.listPaginated({
      page: query.page,
      limit: query.limit,
      keyword: query.keyword,
      departmentId: query.departmentId,
      isActive: query.isActive,
    });

    // Sinh pre-signed URL song song cho tất cả avatar (Promise.all — không N+1 tuần tự)
    const signedUrls = await Promise.all(
      items.map(u =>
        u.avatarUrl
          ? this.objectStorage.getSignedUrl(extractStorageKey(u.avatarUrl))
          : Promise.resolve(''),
      ),
    );

    return {
      items: items.map((u, i) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        employeeId: u.employeeId,
        departmentId: u.departmentId,
        departmentName: u.department?.name ?? '',
        role: u.role,
        isActive: u.isActive,
        avatarUrl: signedUrls[i],
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
