import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises } from 'fs';
import { ILocalAudioStoragePort } from '../../domain/ports/local-audio-storage.port';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import { LiveSessionEndedEvent } from '../../domain/events/live-session-ended.event';
import {
  LOCAL_AUDIO_STORAGE_PORT,
  TRANSCRIPT_BUFFER_PORT,
  TRANSCRIPT_BLOCK_REPOSITORY,
} from '../../meetings.tokens';
import {
  OBJECT_STORAGE_PORT,
} from '../../../../shared/object-storage/object-storage.tokens';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { TranscriptionService } from './transcription.service';
import { LiveSessionService } from './live-session.service';
import { AudioConverter } from '../../infrastructure/audio/audio-converter';

@Injectable()
export class FinalizeSessionService {
  private readonly logger = new Logger(FinalizeSessionService.name);

  constructor(
    @Inject(LOCAL_AUDIO_STORAGE_PORT) private readonly audioStorage: ILocalAudioStoragePort,
    @Inject(TRANSCRIPT_BUFFER_PORT) private readonly buffer: ITranscriptBufferPort,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly transcriptRepo: ITranscriptBlockRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: IObjectStoragePort,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventBus: IEventPublisherPort,
    private readonly transcriptionSvc: TranscriptionService,
    private readonly liveSessionSvc: LiveSessionService,
    private readonly cfg: ConfigService,
  ) { }

  async finalize(meetingId: string, userId: string): Promise<void> {
    this.logger.log(`Finalizing session: ${meetingId}`);

    // 1. Flush VAD — lấy phần audio dang dở cuối cùng (nếu có)
    try {
      const lastBlock = await this.transcriptionSvc.flushSession(meetingId);
      if (lastBlock) {
        this.logger.debug(`Flushed 1 trailing block for ${meetingId}`);
      }
    } catch (err) {
      this.logger.warn(`VAD flush error for ${meetingId}: ${err}`);
    }

    // 2. Đóng file audio tạm → lấy path
    let tempPath: string;
    try {
      tempPath = await this.audioStorage.close(meetingId);
    } catch (err) {
      this.logger.error(`Cannot close audio stream for ${meetingId}: ${err}`);
      throw err;
    }

    // 3. Lấy toàn bộ blocks từ Redis buffer → bulkSave vào DB
    const blocks = await this.buffer.drainAll(meetingId);
    if (blocks.length > 0) {
      await this.transcriptRepo.bulkSave(blocks);
      this.logger.log(`Saved ${blocks.length} transcript blocks for ${meetingId}`);
    }

    // 4. Convert raw PCM to WAV 16kHz so browser can play it, and upload to MinIO
    const browserSampleRate = this.cfg.get<number>('transcription.browserSampleRate') ?? 48000;
    const audioKey = `audio/${meetingId}.wav`;
    let audioUrl = audioKey;
    try {
      const fileData = await fsPromises.readFile(tempPath);
      const wavBuffer = await AudioConverter.toWav16k(fileData, browserSampleRate);
      await this.objectStorage.upload(wavBuffer, audioKey, 'audio/wav');
      audioUrl = audioKey;
      this.logger.log(`Audio converted to WAV and uploaded: ${audioKey}`);
    } catch (err) {
      this.logger.error(`Audio upload failed for ${meetingId}: ${err}`);
    }

    // 5. Xóa file tạm
    await this.audioStorage.remove(tempPath);

    // 6. Tính duration (từ block cuối cùng)
    const durationSeconds = blocks.length > 0
      ? Math.ceil(blocks[blocks.length - 1].endTime)
      : 0;

    // 7. Publish domain event → MeetingEventsListener sẽ cập nhật Meeting.COMPLETED
    await this.eventBus.publish(
      new LiveSessionEndedEvent(meetingId, audioUrl, durationSeconds),
    );

    // 8. Cleanup
    await this.buffer.cleanup(meetingId);
    this.transcriptionSvc.cleanupSession(meetingId);
    await this.liveSessionSvc.cleanupRegistry(meetingId, userId);

    this.logger.log(`Session finalized: ${meetingId}`);
  }
}
