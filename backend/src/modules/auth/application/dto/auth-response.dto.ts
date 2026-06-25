import { UserRole } from '../../../users/domain/entities/user.entity';

export class AuthUserDto {
  id: string;
  fullName: string;
  role: UserRole;
  departmentId: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
}
