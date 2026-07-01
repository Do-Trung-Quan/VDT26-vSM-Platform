import * as ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';

export class AudioConverter {
  private static ffmpegPath = 'ffmpeg';

  static init(ffmpegBinaryPath: string): void {
    AudioConverter.ffmpegPath = ffmpegBinaryPath;
    ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  }

  /**
   * Raw PCM (từ browser, 48kHz signed 16-bit LE) → WAV 16kHz mono.
   * Trả về Buffer có WAV header (44 bytes) + PCM data.
   */
  static toWav16k(pcmBuffer: Buffer, inputRate: number = 48000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const input  = Readable.from(pcmBuffer);
      const output = new PassThrough();
      const chunks: Buffer[] = [];

      output.on('data',  (chunk: Buffer) => chunks.push(chunk));
      output.on('end',   () => resolve(Buffer.concat(chunks)));
      output.on('error', reject);

      ffmpeg(input)
        .inputOptions(['-f s16le', `-ar ${inputRate}`, '-ac 1'])
        .outputOptions(['-ar 16000', '-ac 1', '-c:a pcm_s16le'])
        .format('wav')
        .on('error', (err: Error) => reject(err))
        .pipe(output, { end: true });
    });
  }

  /**
   * File audio (MP3 hoặc WAV, bất kỳ sample rate) → WAV 16kHz mono.
   * ffmpeg tự nhận dạng định dạng đầu vào — không cần khai báo -f.
   * Trả về Buffer có WAV header (44 bytes) + PCM 16-bit LE data.
   */
  static fileToWav16k(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const input  = Readable.from(buffer);
      const output = new PassThrough();
      const chunks: Buffer[] = [];

      output.on('data',  (chunk: Buffer) => chunks.push(chunk));
      output.on('end',   () => resolve(Buffer.concat(chunks)));
      output.on('error', reject);

      ffmpeg(input)
        .outputOptions(['-ar 16000', '-ac 1', '-c:a pcm_s16le'])
        .format('wav')
        .on('error', (err: Error) => reject(err))
        .pipe(output, { end: true });
    });
  }

  /**
   * Bỏ WAV header (44 bytes chuẩn) để lấy raw PCM 16kHz 16-bit mono.
   * Chỉ dùng sau khi gọi fileToWav16k / toWav16k.
   */
  static stripWavHeader(wavBuffer: Buffer): Buffer {
    return wavBuffer.subarray(44);
  }
}
