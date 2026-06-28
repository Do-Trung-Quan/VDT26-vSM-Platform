import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY } from '../../meetings.tokens';
import { TranscriptBlockResponseDto } from '../dto/responseDto/TranscriptBlockResponseDto';

@Injectable()
export class GetTranscriptHandler {
  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
  ) {}

  async execute(meetingId: string): Promise<TranscriptBlockResponseDto[]> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const blocks = await this.blockRepo.findByMeeting(meetingId);
    return blocks.map(TranscriptBlockResponseDto.from);
  }
}
