import { Department } from '../../domain/entities/department.entity';

export class DepartmentDto {
  id: string;
  name: string;
  address: string;
  description: string | null;
  userCount: number;
  deleted: boolean;
  createdAt: string;
}

export function toDepartmentDto(dept: Department, userCount: number): DepartmentDto {
  return {
    id: dept.id,
    name: dept.name,
    address: dept.address,
    description: dept.description,
    userCount,
    deleted: dept.deletedAt !== null,
    createdAt: dept.createdAt.toISOString(),
  };
}
