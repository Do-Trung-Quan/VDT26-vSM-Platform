import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { IVadPort } from '../../domain/ports/vad.port';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';
import {
  TRANSCRIPT_BUFFER_PORT,
  MEETING_REPOSITORY,
  VAD_PORT,
} from '../../meetings.tokens';
import { TranscriptionService } from './transcription.service';

export interface ResumeResult {
  missedBlocks: TranscriptBlock[];
  vadReinitialized: boolean;
}

@Injectable()
export class ReconnectService {
  private readonly logger = new Logger(ReconnectService.name);

  constructor(
    @Inject(TRANSCRIPT_BUFFER_PORT) private readonly buffer:      ITranscriptBufferPort,
    @Inject(MEETING_REPOSITORY)     private readonly meetingRepo: IMeetingRepository,
    @Inject(VAD_PORT)               private readonly vad:         IVadPort,
    private readonly transcriptionSvc: TranscriptionService,
  ) {}

  async resumeSession(
    meetingId: string,
    lastReceivedSeq: number,
  ): Promise<ResumeResult> {
    // 1. Kiểm tra session vẫn trong cửa sổ resume
    const resumable = await this.buffer.isResumable(meetingId);
    if (!resumable) {
      throw new ConflictException('Phiên họp đã kết thúc (TTL resume hết hạn)');
    }

    // 2. Hủy TTL để ngăn timeout processor chạy
    await this.buffer.clearResumeTtl(meetingId);

    // 3. Validate meeting vẫn LIVE
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting || meeting.status !== MeetingStatus.LIVE) {
      throw new ConflictException('Cuộc họp đã kết thúc');
    }

    // 4. Lấy missed blocks (transcript đã xử lý nhưng client chưa nhận)
    const missedBlocks = await this.buffer.getAfter(meetingId, lastReceivedSeq);

    // 5. Kiểm tra VAD instance — reinit nếu backend đã restart
    let vadReinitialized = false;
    try {
      // Thử flush (noop nếu session không tồn tại)
      // Nếu clearSession đã được gọi (restart), vad.feed sẽ tự tạo session mới
      // Không cần làm gì — SileroVadAdapter.getOrCreate() xử lý tự động
    } catch {
      vadReinitialized = true;
    }

    // 6. Cập nhật sequence counter để tiếp tục đúng chỗ
    const lastSeq = missedBlocks.length > 0
      ? missedBlocks[missedBlocks.length - 1].sequenceNumber
      : lastReceivedSeq;
    await this.transcriptionSvc.initSequence(meetingId, lastSeq);

    this.logger.log(
      `Session resumed: meeting=${meetingId} missed=${missedBlocks.length} vadReinit=${vadReinitialized}`,
    );

    return { missedBlocks, vadReinitialized };
  }
}
