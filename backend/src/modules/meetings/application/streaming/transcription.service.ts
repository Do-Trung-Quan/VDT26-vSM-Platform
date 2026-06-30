import { Inject, Injectable, Logger } from '@nestjs/common';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';
import { IVadPort } from '../../domain/ports/vad.port';
import { ISpeechToTextPort } from '../../domain/ports/speech-to-text.port';
import { ISpeakerEmbeddingPort } from '../../domain/ports/speaker-embedding.port';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { ILocalAudioStoragePort } from '../../domain/ports/local-audio-storage.port';
import {
  VAD_PORT,
  SPEECH_TO_TEXT_PORT,
  SPEAKER_EMBEDDING_PORT,
  TRANSCRIPT_BUFFER_PORT,
  LOCAL_AUDIO_STORAGE_PORT,
} from '../../meetings.tokens';
import { SpeakerDiarizationService } from './speaker-diarization.service';

@Injectable()
export class TranscriptionService {
  private readonly logger  = new Logger(TranscriptionService.name);
  // sequence counter per session (in-memory, reset nếu server restart)
  private readonly seqMap  = new Map<string, number>();

  constructor(
    @Inject(VAD_PORT)                private readonly vad:          IVadPort,
    @Inject(SPEECH_TO_TEXT_PORT)     private readonly stt:          ISpeechToTextPort,
    @Inject(SPEAKER_EMBEDDING_PORT)  private readonly embedding:    ISpeakerEmbeddingPort,
    @Inject(TRANSCRIPT_BUFFER_PORT)  private readonly buffer:       ITranscriptBufferPort,
    @Inject(LOCAL_AUDIO_STORAGE_PORT) private readonly audioStorage: ILocalAudioStoragePort,
    private readonly diarization: SpeakerDiarizationService,
  ) {}

  /**
   * Khởi tạo sequence counter cho session (gọi khi open_session).
   * Nếu resume, đọc sequence cuối từ Redis để tiếp tục.
   */
  async initSequence(meetingId: string, startFrom = 0): Promise<void> {
    this.seqMap.set(meetingId, startFrom);
  }

  /**
   * Xử lý 1 PCM chunk từ client.
   * Trả về mảng TranscriptBlock mới (nếu VAD cắt được utterance), rỗng nếu chưa đủ.
   */
  async processChunk(meetingId: string, pcmChunk: Buffer): Promise<TranscriptBlock[]> {
    // Ghi nối tiếp audio thô vào file tạm (Phase C — sequence diagram)
    await this.audioStorage.append(meetingId, pcmChunk);

    const segments = await this.vad.feed(meetingId, pcmChunk);
    if (segments.length === 0) return [];

    const result: TranscriptBlock[] = [];

    for (const seg of segments) {
      const [transcripts, embeddings] = await Promise.all([
        this.stt.batchTranscribe([seg.buffer]),
        this.embedding.batchGetEmbeddings([seg.buffer]),
      ]);

      const text         = transcripts[0] ?? '';
      const speakerLabel = this.diarization.assignLabel(meetingId, embeddings[0] ?? null);

      if (!text.trim()) continue; // bỏ qua segment nhiễu không có text

      const block         = new TranscriptBlock();
      block.meetingId     = meetingId;
      block.sequenceNumber = this.nextSeq(meetingId);
      block.text          = text;
      block.speakerLabel  = speakerLabel;
      block.startTime     = seg.startTime;
      block.endTime       = seg.endTime;

      await this.buffer.push(meetingId, block);
      result.push(block);
    }

    return result;
  }

  /**
   * Flush VAD để lấy phần audio còn dang dở khi kết thúc session.
   * Trả về block cuối (nếu có).
   */
  async flushSession(meetingId: string): Promise<TranscriptBlock | null> {
    const seg = await this.vad.flush(meetingId);
    if (!seg || seg.buffer.length === 0) return null;

    const [transcripts, embeddings] = await Promise.all([
      this.stt.batchTranscribe([seg.buffer]),
      this.embedding.batchGetEmbeddings([seg.buffer]),
    ]);

    const text = transcripts[0] ?? '';
    if (!text.trim()) return null;

    const block          = new TranscriptBlock();
    block.meetingId      = meetingId;
    block.sequenceNumber = this.nextSeq(meetingId);
    block.text           = text;
    block.speakerLabel   = this.diarization.assignLabel(meetingId, embeddings[0] ?? null);
    block.startTime      = seg.startTime;
    block.endTime        = seg.endTime;

    await this.buffer.push(meetingId, block);
    return block;
  }

  cleanupSession(meetingId: string): void {
    this.seqMap.delete(meetingId);
    this.vad.clearSession(meetingId);
    this.diarization.destroySession(meetingId);
  }

  private nextSeq(meetingId: string): number {
    const seq = (this.seqMap.get(meetingId) ?? 0) + 1;
    this.seqMap.set(meetingId, seq);
    return seq;
  }
}
