import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { IMeetingSummaryRepository } from '../../domain/ports/meeting-summary.repository.port';
import { MEETING_REPOSITORY, MEETING_SUMMARY_REPOSITORY } from '../../meetings.tokens';
import { SummaryResponseDto } from '../dto/responseDto/SummaryResponseDto';
import { MeetingSummaryStatus } from '../../domain/entities/meeting-summary.entity';

@Injectable()
export class GetSummaryHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(MEETING_SUMMARY_REPOSITORY) private readonly summaryRepo: IMeetingSummaryRepository,
  ) {}

  async execute(meetingId: string): Promise<SummaryResponseDto> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const summary = await this.summaryRepo.findByMeeting(meetingId);
    if (!summary) return { status: 'NOT_STARTED', summaryText: null };

    return {
      status: summary.status,
      summaryText: summary.status === MeetingSummaryStatus.COMPLETED ? summary.summaryText : null,
    };
  }
}
