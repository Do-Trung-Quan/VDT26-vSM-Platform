import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../../../queue/queue.constants';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { Inject } from '@nestjs/common';
import { TRANSCRIPT_BUFFER_PORT } from '../../meetings.tokens';
import { FinalizeSessionService } from '../streaming/finalize-session.service';

export interface SessionTimeoutPayload {
  meetingId: string;
  userId:    string;
}

@Processor(QUEUE_NAMES.LIVE_SESSION_TIMEOUT)
@Injectable()
export class LiveSessionTimeoutListener extends WorkerHost {
  private readonly logger = new Logger(LiveSessionTimeoutListener.name);

  constructor(
    @Inject(TRANSCRIPT_BUFFER_PORT) private readonly buffer:       ITranscriptBufferPort,
    private readonly finalizeSvc: FinalizeSessionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_NAMES.SESSION_TIMEOUT) return;

    const { meetingId, userId } = job.data as SessionTimeoutPayload;

    // Kiểm tra lại — nếu client đã resume trước khi job chạy thì bỏ qua
    const stillWaiting = await this.buffer.isResumable(meetingId);
    if (!stillWaiting) {
      this.logger.log(`Timeout job: session ${meetingId} already resumed, skipping`);
      return;
    }

    this.logger.log(`Timeout job: auto-finalizing session ${meetingId}`);
    await this.finalizeSvc.finalize(meetingId, userId);
  }
}
