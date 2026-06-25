import { UserRole } from '../../domain/entities/user.entity';

export class UserListItemDto {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string;
  createdAt: string;
}
