import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { extname } from 'path';
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
import { UploadAudioMeetingDto } from '../dto/upload-audio-meeting.dto';

@Injectable()
export class UploadAudioMeetingHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION_BATCH) private readonly transcriptionQueue: Queue,
  ) {}

  async execute(
    dto: UploadAudioMeetingDto,
    file: Express.Multer.File,
    currentUser: CurrentUserPayload,
  ): Promise<Meeting> {
    const meeting = new Meeting();
    meeting.title = dto.title;
    meeting.description = dto.description ?? null;
    meeting.type = MeetingType.UPLOAD;
    meeting.hostId = currentUser.id;
    meeting.departmentId =
      currentUser.role === 'ADMIN' && dto.departmentId
        ? dto.departmentId
        : currentUser.departmentId;
    meeting.status = MeetingStatus.PROCESSING;
    meeting.isLocked = false;
    meeting.deletedAt = null;

    meeting.markProcessing();

    // Upload file audio lên MinIO, lưu key (không lưu URL đầy đủ)
    const ext = extname(file.originalname) || '.wav';
    const audioKey = `audio/${Date.now()}-${meeting.id}${ext}`;
    await this.objectStorage.upload(file.buffer, audioKey, file.mimetype);
    meeting.audioUrl = audioKey;

    await this.meetingRepo.save(meeting);

    // Push job BullMQ — BatchTranscriptionProcessor xử lý ở Phase 6
    await this.transcriptionQueue.add(JOB_NAMES.BATCH_TRANSCRIBE_MEETING, {
      meetingId: meeting.id,
      audioKey,
    });

    await this.eventPublisher.publish(
      new MeetingCreatedEvent(meeting.id, meeting.title, meeting.departmentId, meeting.hostId),
    );

    return meeting;
  }
}
