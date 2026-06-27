import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';

@Injectable()
export class SoftDeleteMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(meetingId: string, currentUser: CurrentUserPayload): Promise<void> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    if (currentUser.role !== 'ADMIN' && meeting.hostId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ có thể xóa cuộc họp do mình tạo');
    }

    meeting.softDelete();
    await this.meetingRepo.save(meeting);
  }
}
