import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, ListUsersOptions, PaginatedUsers, UserUpdateFields } from '../../domain/ports/user.repository.port';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async save(user: User): Promise<void> {
    await this.repo.save(user);
  }

  async updateFields(id: string, fields: UserUpdateFields): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await this.repo.update({ id }, fields as any);
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id }, relations: ['department'] });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findByEmployeeId(employeeId: string): Promise<User | null> {
    return this.repo.findOne({ where: { employeeId } });
  }

  async listPaginated(options: ListUsersOptions): Promise<PaginatedUsers> {
    const { page, limit, keyword, departmentId, isActive } = options;

    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'dept')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (keyword) {
      qb.andWhere(
        '(u.full_name ILIKE :kw OR u.email ILIKE :kw OR u.employee_id ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    if (departmentId) {
      qb.andWhere('u.department_id = :departmentId', { departmentId });
    }

    if (isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async countActiveByDepartmentId(departmentId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('u')
      .where('u.department_id = :departmentId', { departmentId })
      .andWhere('u.is_active = true')
      .getCount();
  }
}
