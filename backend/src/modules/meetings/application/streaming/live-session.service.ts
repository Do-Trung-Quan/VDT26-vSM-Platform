import { Inject, Injectable, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILiveSessionRegistryPort } from '../../domain/ports/live-session-registry.port';
import { ILocalAudioStoragePort } from '../../domain/ports/local-audio-storage.port';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import {
  LIVE_SESSION_REGISTRY_PORT,
  LOCAL_AUDIO_STORAGE_PORT,
  TRANSCRIPT_BUFFER_PORT,
  MEETING_REPOSITORY,
} from '../../meetings.tokens';
import { TranscriptionService } from './transcription.service';

@Injectable()
export class LiveSessionService {
  private readonly logger           = new Logger(LiveSessionService.name);
  private readonly maxConcurrent:   number;
  private readonly maxPerUser:      number;
  private readonly resumeTtlSeconds: number;

  constructor(
    @Inject(LIVE_SESSION_REGISTRY_PORT) private readonly registry:    ILiveSessionRegistryPort,
    @Inject(LOCAL_AUDIO_STORAGE_PORT)   private readonly audioStorage: ILocalAudioStoragePort,
    @Inject(TRANSCRIPT_BUFFER_PORT)     private readonly buffer:       ITranscriptBufferPort,
    @Inject(MEETING_REPOSITORY)         private readonly meetingRepo:  IMeetingRepository,
    private readonly transcriptionSvc: TranscriptionService,
    private readonly cfg: ConfigService,
  ) {
    this.maxConcurrent    = cfg.get<number>('transcription.maxConcurrentSessions') ?? 20;
    this.maxPerUser       = 2;
    this.resumeTtlSeconds = cfg.get<number>('transcription.liveResumeTtlSeconds') ?? 120;
  }

  /** Phase B init — gọi khi nhận open_session. */
  async openSession(meetingId: string, userId: string): Promise<void> {
    // Kiểm tra ngưỡng toàn hệ thống
    const total = await this.registry.countLive();
    if (total >= this.maxConcurrent) {
      throw new ConflictException(`Hệ thống đang đạt giới hạn ${this.maxConcurrent} phiên live`);
    }

    // Kiểm tra ngưỡng per-user
    const userCount = await this.registry.countUserSessions(userId);
    if (userCount >= this.maxPerUser) {
      throw new ConflictException(`Bạn đang có ${this.maxPerUser} phiên live đang chạy`);
    }

    // Validate meeting còn LIVE trong DB
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting || meeting.status !== MeetingStatus.LIVE) {
      throw new ConflictException('Cuộc họp không ở trạng thái LIVE');
    }

    if (!meeting.startedAt) {
      meeting.beginRecording();
      await this.meetingRepo.save(meeting);
    }

    // Khởi tạo các resource
    this.audioStorage.initStream(meetingId);
    await this.buffer.allocate(meetingId);
    await this.transcriptionSvc.initSequence(meetingId, 0);

    // Ghi nhận session
    await this.registry.increment();
    await this.registry.addUserSession(userId, meetingId);

    this.logger.log(`Session opened: meeting=${meetingId} user=${userId}`);
  }

  async onDisconnect(meetingId: string, userId: string): Promise<void> {
    await this.buffer.setResumeTtl(meetingId, this.resumeTtlSeconds + 5);
    this.logger.log(`Session disconnected (TTL ${this.resumeTtlSeconds}s + 5s buffer): ${meetingId}`);
    // Không cleanup registry/session ở đây — chờ resume hoặc timeout
  }

  /** Dọn dẹp registry sau khi finalize. */
  async cleanupRegistry(meetingId: string, userId: string): Promise<void> {
    await this.registry.decrement();
    await this.registry.removeUserSession(userId, meetingId);
  }
}
