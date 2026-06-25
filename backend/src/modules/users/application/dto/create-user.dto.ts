import { IsEmail, IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(2)
  employeeId: string;

  @IsUUID()
  departmentId: string;

  @IsEnum(UserRole)
  role: UserRole;
}
