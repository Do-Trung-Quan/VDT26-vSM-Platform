import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingSummary } from '../../domain/entities/meeting-summary.entity';
import { IMeetingSummaryRepository } from '../../domain/ports/meeting-summary.repository.port';

@Injectable()
export class MeetingSummaryRepository implements IMeetingSummaryRepository {
  constructor(
    @InjectRepository(MeetingSummary)
    private readonly repo: Repository<MeetingSummary>,
  ) {}

  async save(summary: MeetingSummary): Promise<void> {
    await this.repo.save(summary);
  }

  async findByMeeting(meetingId: string): Promise<MeetingSummary | null> {
    return this.repo.findOne({ where: { meetingId } });
  }
}
