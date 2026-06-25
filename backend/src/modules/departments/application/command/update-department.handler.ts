import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDepartmentRepository } from '../../domain/ports/department.repository.port';
import { IUserRepository } from '../../../users/domain/ports/user.repository.port';
import { DEPARTMENT_REPOSITORY } from '../../departments.tokens';
import { USER_REPOSITORY } from '../../../users/users.tokens';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { DepartmentDto, toDepartmentDto } from '../dto/department.dto';

@Injectable()
export class UpdateDepartmentHandler {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly deptRepo: IDepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(deptId: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const dept = await this.deptRepo.findActiveById(deptId);
    if (!dept) throw new NotFoundException('Phòng ban không tồn tại hoặc đã bị xóa');

    if (dto.name && dto.name !== dept.name) {
      const nameExists = await this.deptRepo.existsActiveByName(dto.name, deptId);
      if (nameExists) {
        throw new ConflictException(`Phòng ban "${dto.name}" đã tồn tại`);
      }
      dept.name = dto.name;
    }

    if (dto.address !== undefined) dept.address = dto.address;
    if (dto.description !== undefined) dept.description = dto.description ?? null;

    await this.deptRepo.save(dept);

    const userCount = await this.userRepo.countActiveByDepartmentId(deptId);
    return toDepartmentDto(dept, userCount);
  }
}
