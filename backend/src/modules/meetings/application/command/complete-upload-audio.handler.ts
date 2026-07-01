import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IsUUID } from 'class-validator';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { MeetingCreatedEvent } from '../../domain/events/meeting-created.event';
import { MeetingDetailResponseDto } from '../dto/responseDto/MeetingDetailResponseDto';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';

export class CompleteUploadAudioRequestDto {
  @IsUUID()
  meetingId: string;
}

@Injectable()
export class CompleteUploadAudioHandler {
  constructor(
    @Inject(MEETING_REPOSITORY)   private readonly meetingRepo:        IMeetingRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher:     IEventPublisherPort,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION_BATCH) private readonly transcriptionQueue: Queue,
  ) {}

  async execute(dto: CompleteUploadAudioRequestDto, currentUser: CurrentUserPayload): Promise<MeetingDetailResponseDto> {
    const meeting = await this.meetingRepo.findActiveById(dto.meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    if (meeting.hostId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Không có quyền thao tác cuộc họp này');
    }
    if (meeting.status !== MeetingStatus.PROCESSING || !meeting.audioUrl) {
      throw new BadRequestException('Cuộc họp không ở trạng thái chờ xử lý');
    }

    await this.transcriptionQueue.add(JOB_NAMES.BATCH_TRANSCRIBE_MEETING, {
      meetingId: meeting.id,
      audioKey:  meeting.audioUrl,
    });

    await this.eventPublisher.publish(
      new MeetingCreatedEvent(meeting.id, meeting.title, meeting.departmentId, meeting.hostId),
    );

    return MeetingDetailResponseDto.from(meeting, null);
  }
}
