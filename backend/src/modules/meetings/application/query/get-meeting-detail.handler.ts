import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { MeetingDetailDto } from '../dto/meeting-detail.dto';

@Injectable()
export class GetMeetingDetailHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
  ) {}

  async execute(meetingId: string): Promise<MeetingDetailDto> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const signedAudioUrl = meeting.audioUrl
      ? await this.objectStorage.getSignedUrl(meeting.audioUrl, 3 * 3600) // 3h cho audio player
      : null;

    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      status: meeting.status,
      hostId: meeting.hostId,
      hostName: meeting.host?.fullName ?? '',
      departmentId: meeting.departmentId,
      departmentName: meeting.department?.name ?? '',
      audioUrl: signedAudioUrl,
      durationSeconds: meeting.durationSeconds,
      isLocked: meeting.isLocked,
      startedAt: meeting.startedAt?.toISOString() ?? null,
      endedAt: meeting.endedAt?.toISOString() ?? null,
      createdAt: meeting.createdAt.toISOString(),
    };
  }
}
