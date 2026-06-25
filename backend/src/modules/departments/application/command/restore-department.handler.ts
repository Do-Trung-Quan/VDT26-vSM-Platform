import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDepartmentRepository } from '../../domain/ports/department.repository.port';
import { IUserRepository } from '../../../users/domain/ports/user.repository.port';
import { DEPARTMENT_REPOSITORY } from '../../departments.tokens';
import { USER_REPOSITORY } from '../../../users/users.tokens';
import { DepartmentDto, toDepartmentDto } from '../dto/department.dto';

@Injectable()
export class RestoreDepartmentHandler {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly deptRepo: IDepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(deptId: string): Promise<DepartmentDto> {
    const dept = await this.deptRepo.findById(deptId);
    if (!dept) throw new NotFoundException('Phòng ban không tồn tại');
    if (dept.isActive()) throw new BadRequestException('Phòng ban chưa bị xóa');

    dept.restore();
    await this.deptRepo.save(dept);

    const userCount = await this.userRepo.countActiveByDepartmentId(deptId);
    return toDepartmentDto(dept, userCount);
  }
}
