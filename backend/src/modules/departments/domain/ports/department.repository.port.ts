import { Department } from '../entities/department.entity';

export type DepartmentStatusFilter = 'all' | 'active' | 'deleted';

export interface ListDepartmentsOptions {
  page: number;
  limit: number;
  name?: string;
  status?: DepartmentStatusFilter;
}

export interface PaginatedDepartments {
  items: Department[];
  total: number;
}

export interface IDepartmentRepository {
  save(dept: Department): Promise<void>;
  findById(id: string): Promise<Department | null>;
  findActiveById(id: string): Promise<Department | null>;
  existsActiveByName(name: string, excludeId?: string): Promise<boolean>;
  listPaginated(options: ListDepartmentsOptions): Promise<PaginatedDepartments>;
}
