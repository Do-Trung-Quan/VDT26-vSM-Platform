import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';
import {
  FullTextSearchOptions,
  ITranscriptBlockRepository,
} from '../../domain/ports/transcript-block.repository.port';

@Injectable()
export class TranscriptBlockRepository implements ITranscriptBlockRepository {
  constructor(
    @InjectRepository(TranscriptBlock)
    private readonly repo: Repository<TranscriptBlock>,
  ) {}

  async bulkSave(blocks: TranscriptBlock[]): Promise<void> {
    if (blocks.length === 0) return;
    await this.repo.save(blocks);
  }

  async findByMeeting(meetingId: string): Promise<TranscriptBlock[]> {
    return this.repo
      .createQueryBuilder('tb')
      .where('tb.meeting_id = :meetingId', { meetingId })
      .orderBy('tb.startTime', 'ASC')
      .getMany();
  }

  async fullTextSearch(
    options: FullTextSearchOptions,
  ): Promise<{ items: TranscriptBlock[]; total: number }> {
    const { keyword, departmentId, fromDate, toDate, page, limit } = options;

    const qb = this.repo
      .createQueryBuilder('tb')
      .leftJoinAndSelect('tb.meeting', 'm')
      .where('tb.text ILIKE :kw', { kw: `%${keyword}%` })
      .andWhere('m.deleted_at IS NULL')
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('tb.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (departmentId) qb.andWhere('m.department_id = :deptId', { deptId: departmentId });
    if (fromDate) qb.andWhere('m.created_at >= :from', { from: fromDate });
    if (toDate) qb.andWhere('m.created_at <= :to', { to: toDate });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateSpeakerLabelFrom(
    meetingId: string,
    fromSequence: number,
    newLabel: string,
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(TranscriptBlock)
      .set({ speakerLabel: newLabel })
      .where('meeting_id = :meetingId AND sequence_number >= :seq', {
        meetingId,
        seq: fromSequence,
      })
      .execute();
  }
}
