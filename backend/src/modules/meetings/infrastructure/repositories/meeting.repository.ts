import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Meeting } from '../../domain/entities/meeting.entity';
import {
  IMeetingRepository,
  ListMeetingsOptions,
  PaginatedMeetings,
} from '../../domain/ports/meeting.repository.port';

@Injectable()
export class MeetingRepository implements IMeetingRepository {
  constructor(
    @InjectRepository(Meeting)
    private readonly repo: Repository<Meeting>,
  ) { }

  async save(meeting: Meeting): Promise<void> {
    await this.repo.save(meeting);
  }

  async findById(id: string): Promise<Meeting | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['host', 'department'],
    });
  }

  async findActiveById(id: string): Promise<Meeting | null> {
    return this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.host', 'host')
      .leftJoinAndSelect('m.department', 'dept')
      .where('m.id = :id', { id })
      .andWhere('m.deleted_at IS NULL')
      .getOne();
  }

  async listByDepartment(deptId: string, options: ListMeetingsOptions): Promise<PaginatedMeetings> {
    const qb = this.buildListQuery(options);
    qb.andWhere('m.department_id = :deptId', { deptId });
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listAll(options: ListMeetingsOptions): Promise<PaginatedMeetings> {
    const qb = this.buildListQuery(options);
    if (options.departmentId) {
      qb.andWhere('m.department_id = :deptId', { deptId: options.departmentId });
    }
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async searchByTitle(
    keyword: string,
    departmentId: string | null,
    page: number,
    limit: number,
  ): Promise<PaginatedMeetings> {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.host', 'host')
      .leftJoinAndSelect('m.department', 'dept')
      .where('m.deleted_at IS NULL')
      .andWhere('m.title ILIKE :kw', { kw: `%${keyword}%` })
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (departmentId) {
      qb.andWhere('m.department_id = :deptId', { deptId: departmentId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async countActiveByStatus(status: import('../../domain/entities/meeting.entity').MeetingStatus): Promise<number> {
    return this.repo.count({
      where: { status, deletedAt: IsNull() },
    });
  }

  private buildListQuery(options: ListMeetingsOptions) {
    const { page, limit, status, fromDate, toDate, deletedStatus = 'active' } = options;

    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.host', 'host')
      .leftJoinAndSelect('m.department', 'dept')
      // TypeORM 0.3.x không parse được CASE WHEN trong orderBy() — dùng addSelect alias thay thế
      .addSelect(
        `CASE WHEN "m"."status" = 'LIVE' THEN 1 WHEN "m"."status" = 'PROCESSING' THEN 2 ELSE 3 END`,
        'status_sort',
      )
      .orderBy('status_sort', 'ASC')
      .addOrderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Lọc theo trạng thái xóa mềm
    if (deletedStatus === 'active')  qb.where('m.deleted_at IS NULL');
    else if (deletedStatus === 'deleted') qb.where('m.deleted_at IS NOT NULL');
    // 'all' → không filter deleted_at

    if (status)   qb.andWhere('m.status = :status', { status });
    if (fromDate) qb.andWhere('m.createdAt >= :from', { from: fromDate });
    if (toDate)   qb.andWhere('m.createdAt <= :to',   { to: toDate });

    return qb;
  }
}
