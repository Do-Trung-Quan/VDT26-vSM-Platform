import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MEETING_REPOSITORY } from '../../meetings.tokens';

@Processor(QUEUE_NAMES.DOMAIN_EVENTS)
@Injectable()
export class MeetingEventsListener extends WorkerHost {
  private readonly logger = new Logger(MeetingEventsListener.name);

  constructor(
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_NAMES.PUBLISH_DOMAIN_EVENT) return;

    const { eventName, payload } = job.data as {
      eventName: string;
      payload: Record<string, unknown>;
    };

    if (eventName === 'LiveSessionEndedEvent') {
      await this.handleLiveSessionEnded(payload);
    }
  }

  private async handleLiveSessionEnded(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const meetingId       = payload['meetingId'] as string;
    const audioUrl        = payload['audioUrl']  as string;
    const durationSeconds = (payload['durationSeconds'] as number) ?? 0;

    const meeting = await this.meetingRepo.findById(meetingId);
    if (!meeting) {
      this.logger.warn(`LiveSessionEnded: meeting ${meetingId} not found`);
      return;
    }

    meeting.complete(audioUrl, durationSeconds);
    await this.meetingRepo.save(meeting);
    this.logger.log(`Meeting ${meetingId} marked COMPLETED (duration=${durationSeconds}s)`);
  }
}
