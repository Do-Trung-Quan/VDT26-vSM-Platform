import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository.port';
import { USER_REPOSITORY } from '../../users.tokens';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserProfileDto } from '../dto/user-profile.dto';
import { toProfileDto } from './create-user.handler';

@Injectable()
export class UpdateUserHandler {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, dto: UpdateUserDto): Promise<UserProfileDto> {
    const exists = await this.userRepo.findById(userId);
    if (!exists) throw new NotFoundException('Người dùng không tồn tại');

    // Dùng updateFields() thay vì modify entity + save()
    // để tránh FK ambiguity: khi findById() load relation department,
    // TypeORM ưu tiên user.department.id khi save() → bỏ qua thay đổi user.departmentId
    const fields: { role?: any; departmentId?: string } = {};
    if (dto.role !== undefined) fields.role = dto.role;
    if (dto.departmentId !== undefined) fields.departmentId = dto.departmentId;

    if (Object.keys(fields).length > 0) {
      await this.userRepo.updateFields(userId, fields);
    }

    // Tải lại sau update để trả departmentName chính xác
    const updated = await this.userRepo.findById(userId);
    return toProfileDto(updated!);
  }
}
