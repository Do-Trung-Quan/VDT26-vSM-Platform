import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { MeetingDetailResponseDto } from '../dto/responseDto/MeetingDetailResponseDto';
import { extractStorageKey } from '../../../users/application/command/create-user.handler';

@Injectable()
export class GetMeetingDetailHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
  ) {}

  async execute(meetingId: string): Promise<MeetingDetailResponseDto> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const signedAudioUrl = meeting.audioUrl
      ? await this.objectStorage.getSignedUrl(extractStorageKey(meeting.audioUrl), 3 * 3600)
      : null;

    const signedHostAvatarUrl = meeting.host?.avatarUrl
      ? await this.objectStorage.getSignedUrl(extractStorageKey(meeting.host.avatarUrl))
      : null;

    return MeetingDetailResponseDto.from(meeting, signedAudioUrl, signedHostAvatarUrl);
  }
}
