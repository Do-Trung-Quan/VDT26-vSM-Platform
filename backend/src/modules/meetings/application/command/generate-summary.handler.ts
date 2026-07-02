import {
  BadRequestException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { IMeetingSummaryRepository } from '../../domain/ports/meeting-summary.repository.port';
import { MEETING_REPOSITORY, MEETING_SUMMARY_REPOSITORY } from '../../meetings.tokens';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { MeetingSummary, MeetingSummaryStatus } from '../../domain/entities/meeting-summary.entity';
import { MeetingStatus } from '../../domain/entities/meeting.entity';

@Injectable()
export class GenerateSummaryHandler {
  constructor(
    @Inject(MEETING_REPOSITORY)         private readonly meetingRepo: IMeetingRepository,
    @Inject(MEETING_SUMMARY_REPOSITORY) private readonly summaryRepo: IMeetingSummaryRepository,
    @InjectQueue(QUEUE_NAMES.SUMMARY_GENERATION) private readonly queue: Queue,
  ) {}

  async execute(meetingId: string): Promise<{ message: string }> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');
    if (meeting.status !== MeetingStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể tóm tắt cuộc họp đã hoàn thành');
    }

    const existing = await this.summaryRepo.findByMeeting(meetingId);
    // Idempotent: đã xong hoặc đang chạy thì skip, không tạo job mới
    if (existing?.status === MeetingSummaryStatus.COMPLETED)  return { message: 'Tóm tắt đã sẵn có' };
    if (existing?.status === MeetingSummaryStatus.PROCESSING) return { message: 'Tóm tắt đang được xử lý' };

    const summary = existing ?? new MeetingSummary();
    summary.meetingId  = meetingId;
    summary.status     = MeetingSummaryStatus.PROCESSING;
    summary.summaryText = '';
    await this.summaryRepo.save(summary);

    await this.queue.add(
      JOB_NAMES.GENERATE_SUMMARY,
      { meetingId },
      { attempts: 2, backoff: { type: 'exponential', delay: 5_000 } },
    );

    return { message: 'Đang xử lý tóm tắt' };
  }
}
