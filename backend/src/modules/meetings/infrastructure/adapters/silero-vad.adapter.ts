import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AudioSegment, IVadPort } from '../../domain/ports/vad.port';

/**
 * Energy-based VAD (RMS threshold).
 * Phát hiện silence/voice dựa trên RMS energy của từng PCM frame (30ms @ 16kHz mono 16-bit).
 * Không cần native addon — hoạt động trên mọi nền tảng.
 */

const FRAME_MS = 30;   // ms mỗi frame — cố định
const RMS_THRESHOLD = 500; // ngưỡng RMS energy (0–32767)

interface VadSession {
  residual: Buffer;
  utterancePcm: Buffer[];
  silenceFrames: number;
  isSpeaking: boolean;
  utteranceStart: number;   // seconds
  totalFrames: number;
  silenceThreshold: number;   // frames
  bytesPerFrame: number;   // phụ thuộc browserSampleRate
}

@Injectable()
export class SileroVadAdapter implements IVadPort {
  private readonly sessions = new Map<string, VadSession>();
  private readonly silenceThreshold: number; // frames
  private readonly bytesPerFrame: number; // phụ thuộc sample rate

  constructor(private readonly cfg: ConfigService) {
    const silenceMs = cfg.get<number>('transcription.vadSilenceThresholdMs') ?? 500;
    const browserSampleRate = cfg.get<number>('transcription.browserSampleRate') ?? 48000;
    const samplesPerFrame = Math.floor((browserSampleRate * FRAME_MS) / 1000);

    this.bytesPerFrame = samplesPerFrame * 2;
    this.silenceThreshold = Math.ceil(silenceMs / FRAME_MS);
  }

  /** Khởi tạo session với sample rate tùy chỉnh (batch upload dùng 16000). */
  initSession(sessionId: string, sampleRateHz: number): void {
    const samplesPerFrame = Math.floor((sampleRateHz * FRAME_MS) / 1000);
    const silenceMs = this.cfg.get<number>('transcription.vadSilenceThresholdMs') ?? 500;
    this.sessions.set(sessionId, {
      residual: Buffer.alloc(0),
      utterancePcm: [],
      silenceFrames: 0,
      isSpeaking: false,
      utteranceStart: 0,
      totalFrames: 0,
      silenceThreshold: Math.ceil(silenceMs / FRAME_MS),
      bytesPerFrame: samplesPerFrame * 2,
    });
  }

  async feed(sessionId: string, pcmChunk: Buffer): Promise<AudioSegment[]> {
    const session = this.getOrCreate(sessionId);
    const combined = Buffer.concat([session.residual, pcmChunk]);
    const segments: AudioSegment[] = [];
    const bpf = session.bytesPerFrame;

    let offset = 0;
    while (offset + bpf <= combined.length) {
      const frame = combined.subarray(offset, offset + bpf);
      offset += bpf;
      session.totalFrames++;

      const rms = this.computeRms(frame);
      const isVoice = rms > RMS_THRESHOLD;

      if (isVoice) {
        if (!session.isSpeaking) {
          session.isSpeaking = true;
          session.utteranceStart = (session.totalFrames - 1) * FRAME_MS / 1000;
        }
        session.utterancePcm.push(frame);
        session.silenceFrames = 0;
      } else {
        if (session.isSpeaking) {
          session.utterancePcm.push(frame); // include trailing silence in utterance
          session.silenceFrames++;

          if (session.silenceFrames >= session.silenceThreshold) {
            // Cắt utterance
            const endTime = session.totalFrames * FRAME_MS / 1000;
            // Bỏ bớt trailing silence frames ở cuối
            const voiceFrames = session.utterancePcm.slice(
              0,
              session.utterancePcm.length - session.silenceFrames,
            );
            if (voiceFrames.length > 0) {
              segments.push({
                buffer: Buffer.concat(voiceFrames),
                startTime: session.utteranceStart,
                endTime,
              });
            }
            session.utterancePcm = [];
            session.silenceFrames = 0;
            session.isSpeaking = false;
          }
        }
      }
    }

    session.residual = combined.subarray(offset);
    return segments;
  }

  async flush(sessionId: string): Promise<AudioSegment | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isSpeaking || session.utterancePcm.length === 0) return null;

    const endTime = session.totalFrames * FRAME_MS / 1000;
    const buf = Buffer.concat(session.utterancePcm);
    session.utterancePcm = [];
    session.isSpeaking = false;
    return { buffer: buf, startTime: session.utteranceStart, endTime };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private getOrCreate(sessionId: string): VadSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        residual: Buffer.alloc(0),
        utterancePcm: [],
        silenceFrames: 0,
        isSpeaking: false,
        utteranceStart: 0,
        totalFrames: 0,
        silenceThreshold: this.silenceThreshold,
        bytesPerFrame: this.bytesPerFrame,
      });
    }
    return this.sessions.get(sessionId)!;
  }

  private computeRms(frame: Buffer): number {
    let sum = 0;
    for (let i = 0; i < frame.length - 1; i += 2) {
      const sample = frame.readInt16LE(i);
      sum += sample * sample;
    }
    return Math.sqrt(sum / (frame.length / 2));
  }
}
