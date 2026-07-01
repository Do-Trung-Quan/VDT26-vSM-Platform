import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Meeting, MeetingStatus, MeetingType } from '../../domain/entities/meeting.entity';
import { MeetingCreatedEvent } from '../../domain/events/meeting-created.event';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { CurrentUserPayload } from '../../../../common/decorators/current-user.decorator';
import { UploadAudioMeetingRequestDto } from '../dto/requestDto/UploadAudioMeetingRequestDto';
import { MeetingDetailResponseDto } from '../dto/responseDto/MeetingDetailResponseDto';

@Injectable()
export class UploadAudioMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION_BATCH) private readonly transcriptionQueue: Queue,
  ) {}

  async execute(
    dto: UploadAudioMeetingRequestDto,
    file: Express.Multer.File,
    currentUser: CurrentUserPayload,
  ): Promise<MeetingDetailResponseDto> {
    const meeting = new Meeting();
    meeting.id          = randomUUID(); // pre-assign để dùng trong audioKey trước khi save
    meeting.title       = dto.title;
    meeting.description = dto.description ?? null;
    meeting.type        = MeetingType.UPLOAD;
    meeting.hostId      = currentUser.id;
    meeting.departmentId =
      currentUser.role === 'ADMIN' && dto.departmentId
        ? dto.departmentId
        : currentUser.departmentId;
    meeting.isLocked  = false;
    meeting.deletedAt = null;
    meeting.markProcessing(); // sets status = PROCESSING
    if (dto.startedAt) {
      meeting.startedAt = new Date(dto.startedAt);
    }

    const ext      = (extname(file.originalname) || '.bin').toLowerCase();
    const audioKey = `audio/${meeting.id}${ext}`;
    const contentType = file.mimetype || 'audio/octet-stream';
    await this.objectStorage.upload(file.buffer, audioKey, contentType);
    meeting.audioUrl = audioKey;

    await this.meetingRepo.save(meeting);

    await this.transcriptionQueue.add(JOB_NAMES.BATCH_TRANSCRIBE_MEETING, {
      meetingId: meeting.id,
      audioKey,
    });

    await this.eventPublisher.publish(
      new MeetingCreatedEvent(meeting.id, meeting.title, meeting.departmentId, meeting.hostId),
    );

    const saved = await this.meetingRepo.findActiveById(meeting.id);
    return MeetingDetailResponseDto.from(saved!);
  }
}
