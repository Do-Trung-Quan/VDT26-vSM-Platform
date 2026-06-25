import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
