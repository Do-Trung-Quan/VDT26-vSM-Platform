import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Meeting, MeetingStatus } from '../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';

@Injectable()
export class LockMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(meetingId: string, isLocked: boolean): Promise<Meeting> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');
    if (meeting.status !== MeetingStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể khóa biên bản cuộc họp đã hoàn thành');
    }

    isLocked ? meeting.lock() : meeting.unlock();
    await this.meetingRepo.save(meeting);
    return meeting;
  }
}
