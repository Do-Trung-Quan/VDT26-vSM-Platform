import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDepartmentRepository } from '../../domain/ports/department.repository.port';
import { IUserRepository } from '../../../users/domain/ports/user.repository.port';
import { DEPARTMENT_REPOSITORY } from '../../departments.tokens';
import { USER_REPOSITORY } from '../../../users/users.tokens';

/**
 * CỐT LÕI: chặn xóa mềm nếu phòng ban còn nhân sự đang hoạt động.
 * User.department_id là FK NOT NULL → không được tạo bản ghi mồ côi.
 */
@Injectable()
export class DeleteDepartmentHandler {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly deptRepo: IDepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(deptId: string): Promise<void> {
    const dept = await this.deptRepo.findActiveById(deptId);
    if (!dept) throw new NotFoundException('Phòng ban không tồn tại hoặc đã bị xóa');

    const userCount = await this.userRepo.countActiveByDepartmentId(deptId);
    if (userCount > 0) {
      throw new ConflictException(
        `Không thể xóa phòng ban còn ${userCount} nhân sự đang hoạt động`,
      );
    }

    dept.softDelete();
    await this.deptRepo.save(dept);
  }
}
