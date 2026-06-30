import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISpeechToTextPort } from '../../domain/ports/speech-to-text.port';
import { AudioConverter } from '../audio/audio-converter';

interface AsrItem {
  id:         string;
  segment:    string;
  start_time: number;
  end_time:   number;
}

interface AsrResult {
  transcript: string;
  items:      AsrItem[];
  status:     string;
  message:    string;
}

@Injectable()
export class ViettelSpeechToTextAdapter implements ISpeechToTextPort {
  private readonly logger = new Logger(ViettelSpeechToTextAdapter.name);
  private readonly endpoint:      string;
  private readonly timeoutMs:     number;
  private readonly browserSampleRate: number;

  constructor(private readonly cfg: ConfigService) {
    this.endpoint          = cfg.get<string>('ai.speechToTextUrl')!;
    this.timeoutMs         = cfg.get<number>('ai.timeoutMs') ?? 10000;
    this.browserSampleRate = cfg.get<number>('transcription.browserSampleRate') ?? 48000;
  }

  async batchTranscribe(segments: Buffer[]): Promise<string[]> {
    if (segments.length === 0) return [];

    // Node.js 22 global FormData + Blob — không cần import thêm
    const form = new FormData();
    for (let i = 0; i < segments.length; i++) {
      const wav = await AudioConverter.toWav16k(segments[i], this.browserSampleRate);
      form.append('files', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), `file_${i + 1}.wav`);
    }

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        body:   form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        this.logger.error(`ASR HTTP ${res.status} ${res.statusText}`);
        return segments.map(() => '');
      }

      const json = await res.json() as AsrResult[];
      return json.map(item => item.transcript ?? '');
    } catch (err) {
      this.logger.error('ASR batchTranscribe failed', err);
      return segments.map(() => '');
    }
  }
}
