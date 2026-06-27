import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Meeting } from '../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';

@Injectable()
export class RestoreMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(meetingId: string): Promise<Meeting> {
    const meeting = await this.meetingRepo.findById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');
    if (meeting.isActive()) throw new BadRequestException('Cuộc họp chưa bị xóa');

    meeting.restore();
    await this.meetingRepo.save(meeting);
    return meeting;
  }
}
