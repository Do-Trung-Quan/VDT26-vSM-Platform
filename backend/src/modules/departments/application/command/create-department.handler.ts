import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Department } from '../../domain/entities/department.entity';
import { IDepartmentRepository } from '../../domain/ports/department.repository.port';
import { IUserRepository } from '../../../users/domain/ports/user.repository.port';
import { DEPARTMENT_REPOSITORY } from '../../departments.tokens';
import { USER_REPOSITORY } from '../../../users/users.tokens';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { DepartmentDto, toDepartmentDto } from '../dto/department.dto';

@Injectable()
export class CreateDepartmentHandler {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY) private readonly deptRepo: IDepartmentRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const nameExists = await this.deptRepo.existsActiveByName(dto.name);
    if (nameExists) {
      throw new ConflictException(`Phòng ban "${dto.name}" đã tồn tại`);
    }

    const dept = new Department();
    dept.name = dto.name;
    dept.address = dto.address;
    dept.description = dto.description ?? null;
    dept.deletedAt = null;

    await this.deptRepo.save(dept);

    const saved = await this.deptRepo.findActiveById(dept.id);
    return toDepartmentDto(saved!, 0);
  }
}
