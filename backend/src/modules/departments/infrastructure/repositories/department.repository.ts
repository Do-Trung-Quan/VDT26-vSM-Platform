import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../domain/entities/department.entity';
import {
  IDepartmentRepository,
  ListDepartmentsOptions,
  PaginatedDepartments,
} from '../../domain/ports/department.repository.port';

@Injectable()
export class DepartmentRepository implements IDepartmentRepository {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
  ) {}

  async save(dept: Department): Promise<void> {
    await this.repo.save(dept);
  }

  async findById(id: string): Promise<Department | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveById(id: string): Promise<Department | null> {
    return this.repo
      .createQueryBuilder('d')
      .where('d.id = :id', { id })
      .andWhere('d.deleted_at IS NULL')
      .getOne();
  }

  async existsActiveByName(name: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.name = :name', { name })
      .andWhere('d.deleted_at IS NULL');

    if (excludeId) {
      qb.andWhere('d.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  async listPaginated(options: ListDepartmentsOptions): Promise<PaginatedDepartments> {
    const { page, limit, name, status } = options;

    const qb = this.repo
      .createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (name) {
      qb.andWhere('d.name ILIKE :name', { name: `%${name}%` });
    }

    if (status === 'active') {
      qb.andWhere('d.deleted_at IS NULL');
    } else if (status === 'deleted') {
      qb.andWhere('d.deleted_at IS NOT NULL');
    }
    // status === 'all' hoặc undefined → không filter, trả toàn bộ

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
