import { User, UserRole } from '../entities/user.entity';

export interface ListUsersOptions {
  page: number;
  limit: number;
  keyword?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
}

export interface UserUpdateFields {
  role?: UserRole;
  departmentId?: string;
}

export interface IUserRepository {
  save(user: User): Promise<void>;
  /** Partial update dùng repo.update() — tránh FK ambiguity khi entity đã load relation */
  updateFields(id: string, fields: UserUpdateFields): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmployeeId(employeeId: string): Promise<User | null>;
  listPaginated(options: ListUsersOptions): Promise<PaginatedUsers>;
  countActiveByDepartmentId(departmentId: string): Promise<number>;
}
