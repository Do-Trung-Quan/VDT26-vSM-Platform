import { Inject, Injectable } from '@nestjs/common';
import { IDepartmentRepository } from '../../domain/ports/department.repository.port';
import { IUserRepository } from '../../../users/domain/ports/user.repository.port';
import { DEPARTMENT_REPOSITORY } from '../../departments.tokens';
import { USER_REPOSITORY } from '../../../users/users.tokens';
import { ListDepartmentsQueryDto } from '../dto/list-departments-query.dto';
import { DepartmentDto, toDepartmentDto } from '../dto/department.dto';

export interface ListDepartmentsResult {
  items: DepartmentDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListDepartmentsHandler {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly deptRepo: IDepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: ListDepartmentsQueryDto): Promise<ListDepartmentsResult> {
    const { items, total } = await this.deptRepo.listPaginated({
      page: query.page,
      limit: query.limit,
      name: query.name,
      status: query.status,
    });

    const userCounts = await Promise.all(
      items.map((d) => this.userRepo.countActiveByDepartmentId(d.id)),
    );

    return {
      items: items.map((d, i) => toDepartmentDto(d, userCounts[i])),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
