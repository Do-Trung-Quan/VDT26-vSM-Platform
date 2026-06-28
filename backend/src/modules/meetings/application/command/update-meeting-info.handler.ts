import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Meeting } from '../../domain/entities/meeting.entity';
import { MeetingInfoUpdatedEvent } from '../../domain/events/meeting-info-updated.event';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { UpdateMeetingInfoRequestDto } from '../dto/requestDto/UpdateMeetingInfoRequestDto';
import { MeetingUpdateResponseDto } from '../dto/responseDto/MeetingUpdateResponseDto';

@Injectable()
export class UpdateMeetingInfoHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
  ) {}

  async execute(meetingId: string, dto: UpdateMeetingInfoRequestDto): Promise<MeetingUpdateResponseDto> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const oldDepartmentId = meeting.departmentId;

    if (dto.title !== undefined)       meeting.title       = dto.title;
    if (dto.description !== undefined) meeting.description = dto.description ?? null;
    if (dto.departmentId !== undefined) meeting.departmentId = dto.departmentId;

    await this.meetingRepo.save(meeting);

    await this.eventPublisher.publish(
      new MeetingInfoUpdatedEvent(meeting.id, meeting.title, oldDepartmentId, meeting.departmentId),
    );

    const updated = await this.meetingRepo.findActiveById(meetingId);
    return MeetingUpdateResponseDto.from(updated!);
  }
}
