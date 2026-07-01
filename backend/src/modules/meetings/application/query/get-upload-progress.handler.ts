import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/redis/redis.provider';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import { MEETING_REPOSITORY } from '../../meetings.tokens';
import { PROGRESS_KEY, UploadProgress } from '../workers/batch-transcription.processor';

export interface UploadProgressResponse {
  status: MeetingStatus | 'UNKNOWN';
  percent: number;
  stage: string;
  totalSegments: number;
  processedSegments: number;
  errorMessage?: string;
}

@Injectable()
export class GetUploadProgressHandler {
  constructor(
    @Inject(REDIS_CLIENT)    private readonly redis:       Redis,
    @Inject(MEETING_REPOSITORY) private readonly meetingRepo: IMeetingRepository,
  ) {}

  async execute(meetingId: string): Promise<UploadProgressResponse> {
    // Kiểm tra Redis trước (job đang chạy)
    const raw = await this.redis.get(PROGRESS_KEY(meetingId));
    if (raw) {
      const p = JSON.parse(raw) as UploadProgress;
      return {
        status: p.percent === -1 ? 'UNKNOWN' : MeetingStatus.PROCESSING,
        percent: Math.max(0, p.percent),
        stage: p.stage,
        totalSegments: p.totalSegments,
        processedSegments: p.processedSegments,
        errorMessage: p.errorMessage,
      };
    }

    // Redis trống → kiểm tra DB
    const meeting = await this.meetingRepo.findById(meetingId);
    if (!meeting) {
      return { status: 'UNKNOWN', percent: 0, stage: 'Không tìm thấy cuộc họp', totalSegments: 0, processedSegments: 0 };
    }

    if (meeting.status === MeetingStatus.COMPLETED) {
      return { status: MeetingStatus.COMPLETED, percent: 100, stage: 'Hoàn thành', totalSegments: 0, processedSegments: 0 };
    }

    // PROCESSING nhưng job chưa bắt đầu (vừa enqueue)
    return {
      status: MeetingStatus.PROCESSING,
      percent: 0,
      stage: 'Đang chờ xử lý trong hàng đợi...',
      totalSegments: 0,
      processedSegments: 0,
    };
  }
}
