import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISpeakerEmbeddingPort } from '../../domain/ports/speaker-embedding.port';
import { AudioConverter } from '../audio/audio-converter';

interface EmbeddingResult {
  success:   boolean;
  embedding: number[] | null;
  shape?:    number[];
}

@Injectable()
export class ViettelSpeakerIdentifyAdapter implements ISpeakerEmbeddingPort {
  private readonly logger = new Logger(ViettelSpeakerIdentifyAdapter.name);
  private readonly endpoint:          string;
  private readonly timeoutMs:         number;
  private readonly browserSampleRate: number;

  constructor(private readonly cfg: ConfigService) {
    this.endpoint          = cfg.get<string>('ai.speakerIdentifyUrl')!;
    this.timeoutMs         = cfg.get<number>('ai.timeoutMs') ?? 10000;
    this.browserSampleRate = cfg.get<number>('transcription.browserSampleRate') ?? 48000;
  }

  async batchGetEmbeddings(segments: Buffer[], sampleRateHz?: number): Promise<(number[] | null)[]> {
    if (segments.length === 0) return [];

    const form = new FormData();
    for (let i = 0; i < segments.length; i++) {
      const wav = await AudioConverter.toWav16k(segments[i], sampleRateHz ?? this.browserSampleRate);
      form.append('files', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), `file_${i + 1}.wav`);
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        body:   form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        this.logger.error(`Embedding HTTP ${res.status} ${res.statusText}`);
        return segments.map(() => null);
      }

      const json = await res.json() as EmbeddingResult[];
      return json.map(item => (item.success && item.embedding) ? item.embedding : null);
    } catch (err) {
      this.logger.error('Embedding batchGetEmbeddings failed', err);
      return segments.map(() => null);
    }
  }
}
