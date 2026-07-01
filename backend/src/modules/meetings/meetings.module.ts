import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Meeting } from './domain/entities/meeting.entity';
import { TranscriptBlock } from './domain/entities/transcript-block.entity';
import { MeetingSummary } from './domain/entities/meeting-summary.entity';

import {
  MEETING_REPOSITORY,
  TRANSCRIPT_BLOCK_REPOSITORY,
  MEETING_SUMMARY_REPOSITORY,
  SPEECH_TO_TEXT_PORT,
  SPEAKER_EMBEDDING_PORT,
  VAD_PORT,
  LOCAL_AUDIO_STORAGE_PORT,
  TRANSCRIPT_BUFFER_PORT,
  LIVE_SESSION_REGISTRY_PORT,
} from './meetings.tokens';

// Repositories
import { MeetingRepository } from './infrastructure/repositories/meeting.repository';
import { TranscriptBlockRepository } from './infrastructure/repositories/transcript-block.repository';
import { MeetingSummaryRepository } from './infrastructure/repositories/meeting-summary.repository';

// Adapters (Phase 6)
import { SileroVadAdapter } from './infrastructure/adapters/silero-vad.adapter';
import { ViettelSpeechToTextAdapter } from './infrastructure/adapters/viettel-speech-to-text.adapter';
import { ViettelSpeakerIdentifyAdapter } from './infrastructure/adapters/viettel-speaker-identify.adapter';
import { LocalAudioStorageAdapter } from './infrastructure/adapters/local-audio-storage.adapter';
import { AudioConverterInitializer } from './infrastructure/audio/audio-converter-initializer';
import { RedisTranscriptBufferAdapter } from './infrastructure/adapters/redis-transcript-buffer.adapter';
import { RedisLiveSessionRegistryAdapter } from './infrastructure/adapters/redis-live-session-registry.adapter';

// Application Streaming Services
import { SpeakerDiarizationService } from './application/streaming/speaker-diarization.service';
import { TranscriptionService } from './application/streaming/transcription.service';
import { LiveSessionService } from './application/streaming/live-session.service';
import { ReconnectService } from './application/streaming/reconnect.service';
import { FinalizeSessionService } from './application/streaming/finalize-session.service';

// Batch Worker
import { BatchTranscriptionProcessor } from './application/workers/batch-transcription.processor';

// Listeners
import { LiveSessionTimeoutListener } from './application/listeners/live-session-timeout.listener';
import { MeetingEventsListener } from './application/listeners/meeting-events.listener';

// Command Handlers
import { CreateLiveMeetingHandler } from './application/command/create-live-meeting.handler';
import { UploadAudioMeetingHandler } from './application/command/upload-audio-meeting.handler';
import { InitUploadAudioHandler } from './application/command/init-upload-audio.handler';
import { CompleteUploadAudioHandler } from './application/command/complete-upload-audio.handler';
import { SoftDeleteMeetingHandler } from './application/command/soft-delete-meeting.handler';
import { RestoreMeetingHandler } from './application/command/restore-meeting.handler';
import { UpdateMeetingInfoHandler } from './application/command/update-meeting-info.handler';
import { LockMeetingHandler } from './application/command/lock-meeting.handler';
import { EditSpeakerLabelHandler } from './application/command/edit-speaker-label.handler';

// Query Handlers
import { ListMeetingsHandler } from './application/query/list-meetings.handler';
import { ListAllMeetingsHandler } from './application/query/list-all-meetings.handler';
import { GetMeetingDetailHandler } from './application/query/get-meeting-detail.handler';
import { GetTranscriptHandler } from './application/query/get-transcript.handler';
import { SearchMeetingsHandler } from './application/query/search-meetings.handler';
import { GetSummaryHandler } from './application/query/get-summary.handler';
import { FullTextSearchHandler } from './application/query/full-text-search.handler';
import { GetUploadProgressHandler } from './application/query/get-upload-progress.handler';

// Controllers & Gateway
import { MeetingsController } from './presentation/meetings.controller';
import { LiveMeetingsController } from './presentation/live-meetings.controller';
import { AdminMeetingsController } from './presentation/admin-meetings.controller';
import { SummaryController } from './presentation/summary.controller';
import { SearchController } from './presentation/search.controller';
import { TranscriptionGateway } from './presentation/transcription.gateway';

import { ObjectStorageModule } from '../../shared/object-storage/object-storage.module';
import { EventBusModule } from '../../shared/event-bus/event-bus.module';
import { QueueModule } from '../../queue/queue.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { QUEUE_NAMES } from '../../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, TranscriptBlock, MeetingSummary]),
    ObjectStorageModule,
    EventBusModule,
    QueueModule,
    RedisModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRANSCRIPTION_BATCH },
      { name: QUEUE_NAMES.LIVE_SESSION_TIMEOUT },
      { name: QUEUE_NAMES.DOMAIN_EVENTS },
    ),
    // JwtModule để gateway verify token thủ công
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: cfg.get<string>('jwt.accessExpiresIn') },
      }),
    }),
  ],
  providers: [
    // ── Repositories ──────────────────────────────────────────────────────────
    { provide: MEETING_REPOSITORY,          useClass: MeetingRepository },
    { provide: TRANSCRIPT_BLOCK_REPOSITORY, useClass: TranscriptBlockRepository },
    { provide: MEETING_SUMMARY_REPOSITORY,  useClass: MeetingSummaryRepository },

    // ── Phase 6 Adapters ──────────────────────────────────────────────────────
    { provide: VAD_PORT,                    useClass: SileroVadAdapter },
    { provide: SPEECH_TO_TEXT_PORT,         useClass: ViettelSpeechToTextAdapter },
    { provide: SPEAKER_EMBEDDING_PORT,      useClass: ViettelSpeakerIdentifyAdapter },
    { provide: LOCAL_AUDIO_STORAGE_PORT,    useClass: LocalAudioStorageAdapter },
    { provide: TRANSCRIPT_BUFFER_PORT,      useClass: RedisTranscriptBufferAdapter },
    { provide: LIVE_SESSION_REGISTRY_PORT,  useClass: RedisLiveSessionRegistryAdapter },

    // ── Streaming Services ────────────────────────────────────────────────────
    SpeakerDiarizationService,
    TranscriptionService,
    LiveSessionService,
    ReconnectService,
    FinalizeSessionService,

    // ── Workers ───────────────────────────────────────────────────────────────
    BatchTranscriptionProcessor,

    // ── Listeners ─────────────────────────────────────────────────────────────
    LiveSessionTimeoutListener,
    MeetingEventsListener,

    // ── Command Handlers ──────────────────────────────────────────────────────
    CreateLiveMeetingHandler,
    UploadAudioMeetingHandler,
    InitUploadAudioHandler,
    CompleteUploadAudioHandler,
    SoftDeleteMeetingHandler,
    RestoreMeetingHandler,
    UpdateMeetingInfoHandler,
    LockMeetingHandler,
    EditSpeakerLabelHandler,

    // ── Query Handlers ────────────────────────────────────────────────────────
    ListMeetingsHandler,
    ListAllMeetingsHandler,
    GetMeetingDetailHandler,
    GetTranscriptHandler,
    SearchMeetingsHandler,
    GetSummaryHandler,
    FullTextSearchHandler,
    GetUploadProgressHandler,

    // ── Audio Converter (khởi tạo ffmpeg path 1 lần khi module start) ────────
    AudioConverterInitializer,

    // ── Gateway ───────────────────────────────────────────────────────────────
    TranscriptionGateway,
  ],
  controllers: [
    MeetingsController,
    LiveMeetingsController,
    AdminMeetingsController,
    SummaryController,
    SearchController,
  ],
  exports: [MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY, TypeOrmModule],
})
export class MeetingsModule {}
