import { Inject, Injectable } from '@nestjs/common';
import { Meeting, MeetingStatus, MeetingType } from '../../domain/entities/meeting.entity';
import { MeetingCreatedEvent } from '../../domain/events/meeting-created.event';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { CreateLiveMeetingDto } from '../dto/create-live-meeting.dto';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';

@Injectable()
export class CreateLiveMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
  ) {}

  async execute(dto: CreateLiveMeetingDto, currentUser: CurrentUserPayload): Promise<Meeting> {
    const meeting = new Meeting();
    meeting.title = dto.title;
    meeting.description = dto.description ?? null;
    meeting.type = MeetingType.LIVE;
    meeting.hostId = currentUser.id;
    // USER bị ép dept của mình; ADMIN có thể chọn
    meeting.departmentId =
      currentUser.role === 'ADMIN' && dto.departmentId
        ? dto.departmentId
        : currentUser.departmentId;
    meeting.status = MeetingStatus.LIVE;
    meeting.audioUrl = null;
    meeting.durationSeconds = null;
    meeting.isLocked = false;
    meeting.deletedAt = null;

    meeting.startLive();
    await this.meetingRepo.save(meeting);

    await this.eventPublisher.publish(
      new MeetingCreatedEvent(meeting.id, meeting.title, meeting.departmentId, meeting.hostId),
    );

    return meeting;
  }
}
