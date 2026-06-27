import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY } from '../../meetings.tokens';

@Injectable()
export class EditSpeakerLabelHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
  ) {}

  async execute(
    meetingId: string,
    fromSequence: number,
    oldLabel: string,
    newLabel: string,
  ): Promise<void> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    await this.blockRepo.updateSpeakerLabelFrom(meetingId, fromSequence, newLabel);
  }
}
