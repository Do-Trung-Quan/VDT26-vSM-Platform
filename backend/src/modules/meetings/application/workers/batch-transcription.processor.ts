import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { QUEUE_NAMES, JOB_NAMES } from '../../../../queue/queue.constants';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { IVadPort, AudioSegment } from '../../domain/ports/vad.port';
import { ISpeechToTextPort } from '../../domain/ports/speech-to-text.port';
import { ISpeakerEmbeddingPort } from '../../domain/ports/speaker-embedding.port';
import { IObjectStoragePort } from '../../../../shared/object-storage/ports/object-storage.port';
import { IEventPublisherPort } from '../../../../shared/event-bus/ports/event-publisher.port';
import {
  MEETING_REPOSITORY,
  TRANSCRIPT_BLOCK_REPOSITORY,
  VAD_PORT,
  SPEECH_TO_TEXT_PORT,
  SPEAKER_EMBEDDING_PORT,
} from '../../meetings.tokens';
import { OBJECT_STORAGE_PORT } from '../../../../shared/object-storage/object-storage.tokens';
import { EVENT_PUBLISHER_PORT } from '../../../../shared/event-bus/event-bus.tokens';
import { REDIS_CLIENT } from '../../../../shared/redis/redis.provider';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';
import { MeetingStatus } from '../../domain/entities/meeting.entity';
import { MeetingStatusChangedEvent } from '../../domain/events/meeting-status-changed.event';
import { SpeakerDiarizationService } from '../streaming/speaker-diarization.service';
import { AudioConverter } from '../../infrastructure/audio/audio-converter';

export interface UploadProgress {
  percent: number;
  stage: string;
  totalSegments: number;
  processedSegments: number;
  errorMessage?: string;
}

const PROGRESS_KEY = (id: string) => `upload:${id}:progress`;
const PROGRESS_TTL_SECS = 86400; // 24h fallback TTL
const AI_BATCH_SIZE = 5;         // segments per AI call
const PCM_CHUNK_BYTES = 16000 * 2 * 3; // 3s of 16kHz 16-bit mono

@Processor(QUEUE_NAMES.TRANSCRIPTION_BATCH)
@Injectable()
export class BatchTranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchTranscriptionProcessor.name);

  constructor(
    @Inject(MEETING_REPOSITORY)          private readonly meetingRepo:    IMeetingRepository,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo:      ITranscriptBlockRepository,
    @Inject(VAD_PORT)                    private readonly vad:            IVadPort,
    @Inject(SPEECH_TO_TEXT_PORT)         private readonly stt:            ISpeechToTextPort,
    @Inject(SPEAKER_EMBEDDING_PORT)      private readonly embedding:      ISpeakerEmbeddingPort,
    @Inject(OBJECT_STORAGE_PORT)         private readonly objectStorage:  IObjectStoragePort,
    @Inject(EVENT_PUBLISHER_PORT)        private readonly eventBus:       IEventPublisherPort,
    @Inject(REDIS_CLIENT)                private readonly redis:          Redis,
    private readonly diarization: SpeakerDiarizationService,
  ) {
    super();
  }

  async process(job: Job<{ meetingId: string; audioKey: string }>): Promise<void> {
    const { meetingId, audioKey } = job.data;
    this.logger.log(`[batch] start meetingId=${meetingId} audioKey=${audioKey}`);

    try {
      // ── 1. Tải file từ MinIO (5%) ─────────────────────────────────────────
      await this.setProgress(meetingId, 0, 'Đang tải file audio...', 0, 0);
      const rawBuffer = await this.objectStorage.download(audioKey);
      this.logger.log(`[batch] downloaded ${rawBuffer.length} bytes`);

      // ── 2. Chuyển đổi sang WAV 16kHz mono (15%) ──────────────────────────
      await this.setProgress(meetingId, 5, 'Đang chuyển đổi định dạng âm thanh...', 0, 0);
      const wav16k = await AudioConverter.fileToWav16k(rawBuffer);
      const pcm16k = AudioConverter.stripWavHeader(wav16k);
      this.logger.log(`[batch] converted to WAV 16kHz: ${pcm16k.length} PCM bytes`);

      // ── 3. VAD phân đoạn (25%) ────────────────────────────────────────────
      await this.setProgress(meetingId, 15, 'Đang phân tích âm thanh...', 0, 0);
      this.vad.initSession(meetingId, 16000);
      const segments = await this.runVad(meetingId, pcm16k);
      this.vad.clearSession(meetingId);
      this.logger.log(`[batch] VAD found ${segments.length} segments`);

      if (segments.length === 0) {
        this.logger.warn(`[batch] no speech detected for ${meetingId}`);
        await this.completeMeeting(meetingId, [], 0);
        await this.clearProgress(meetingId);
        return;
      }

      await this.setProgress(meetingId, 25, `Đang nhận dạng giọng nói... (0/${segments.length})`, segments.length, 0);

      // ── 4. STT + Speaker Embedding theo lô ───────────────────────────────
      const blocks = await this.runBatchAi(meetingId, segments);

      // ── 5. Lưu transcript blocks (93%) ───────────────────────────────────
      await this.setProgress(meetingId, 93, 'Đang lưu biên bản...', segments.length, segments.length);
      if (blocks.length > 0) {
        await this.blockRepo.bulkSave(blocks);
        this.logger.log(`[batch] saved ${blocks.length} transcript blocks`);
      }

      // ── 6. Hoàn tất meeting (98%) ─────────────────────────────────────────
      await this.setProgress(meetingId, 98, 'Đang hoàn thiện...', segments.length, segments.length);
      const duration = blocks.length > 0 ? Math.ceil(blocks[blocks.length - 1].endTime) : 0;
      await this.completeMeeting(meetingId, blocks, duration);

      // ── 7. Dọn dẹp ───────────────────────────────────────────────────────
      this.diarization.destroySession(meetingId);
      await this.clearProgress(meetingId);
      this.logger.log(`[batch] completed meetingId=${meetingId} duration=${duration}s blocks=${blocks.length}`);

    } catch (err) {
      this.logger.error(`[batch] failed meetingId=${meetingId}: ${err}`);
      await this.setProgress(meetingId, -1, `Lỗi xử lý: ${(err as Error).message}`, 0, 0);
      this.diarization.destroySession(meetingId);
      this.vad.clearSession(meetingId);
      throw err; // BullMQ sẽ retry theo config
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async runVad(meetingId: string, pcm16k: Buffer): Promise<AudioSegment[]> {
    const segments: AudioSegment[] = [];
    let offset = 0;

    while (offset < pcm16k.length) {
      const end   = Math.min(offset + PCM_CHUNK_BYTES, pcm16k.length);
      const chunk = pcm16k.subarray(offset, end);
      const segs  = await this.vad.feed(meetingId, chunk);
      segments.push(...segs);
      offset = end;
    }

    const last = await this.vad.flush(meetingId);
    if (last && last.buffer.length > 0) segments.push(last);

    return segments;
  }

  private async runBatchAi(meetingId: string, segments: AudioSegment[]): Promise<TranscriptBlock[]> {
    const blocks: TranscriptBlock[] = [];
    let seqNum = 1;

    for (let i = 0; i < segments.length; i += AI_BATCH_SIZE) {
      const batch   = segments.slice(i, i + AI_BATCH_SIZE);
      const buffers = batch.map(s => s.buffer);

      const [transcripts, embeddings] = await Promise.all([
        this.stt.batchTranscribe(buffers, 16000),
        this.embedding.batchGetEmbeddings(buffers, 16000),
      ]);

      for (let j = 0; j < batch.length; j++) {
        const text = (transcripts[j] ?? '').trim();
        if (!text) continue;

        const block          = new TranscriptBlock();
        block.meetingId      = meetingId;
        block.sequenceNumber = seqNum++;
        block.text           = text;
        block.speakerLabel   = this.diarization.assignLabel(meetingId, embeddings[j] ?? null);
        block.startTime      = batch[j].startTime;
        block.endTime        = batch[j].endTime;
        blocks.push(block);
      }

      const processed = Math.min(i + AI_BATCH_SIZE, segments.length);
      const percent   = 25 + Math.floor((processed / segments.length) * 68);
      await this.setProgress(
        meetingId, percent,
        `Đang nhận dạng giọng nói... (${processed}/${segments.length})`,
        segments.length, processed,
      );
    }

    return blocks;
  }

  private async completeMeeting(meetingId: string, blocks: TranscriptBlock[], durationSeconds: number): Promise<void> {
    const meeting = await this.meetingRepo.findById(meetingId);
    if (!meeting) {
      this.logger.warn(`[batch] meeting ${meetingId} not found — skip complete`);
      return;
    }

    meeting.startedAt = meeting.startedAt ?? new Date();
    meeting.complete(meeting.audioUrl ?? '', durationSeconds);
    // For uploaded meetings: endedAt = startedAt + durationSeconds (not wall-clock "now")
    if (meeting.startedAt && durationSeconds > 0) {
      meeting.endedAt = new Date(meeting.startedAt.getTime() + durationSeconds * 1000);
    }
    await this.meetingRepo.save(meeting);

    await this.eventBus.publish(
      new MeetingStatusChangedEvent(meetingId, meeting.title, meeting.departmentId, MeetingStatus.COMPLETED),
    );
  }

  private async setProgress(
    meetingId: string,
    percent: number,
    stage: string,
    totalSegments: number,
    processedSegments: number,
  ): Promise<void> {
    const data: UploadProgress = { percent, stage, totalSegments, processedSegments };
    await this.redis.set(PROGRESS_KEY(meetingId), JSON.stringify(data), 'EX', PROGRESS_TTL_SECS);
  }

  private async clearProgress(meetingId: string): Promise<void> {
    await this.redis.del(PROGRESS_KEY(meetingId));
  }
}

export { PROGRESS_KEY };
