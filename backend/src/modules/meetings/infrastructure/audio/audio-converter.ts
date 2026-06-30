import * as ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';

/**
 * Chuyển đổi raw PCM → WAV 16kHz mono 16-bit bằng ffmpeg.
 *
 * Tương đương lệnh thủ công:
 *   ffmpeg -f s16le -ar {inputRate} -ac 1 -i pipe:0
 *          -ar 16000 -ac 1 -c:a pcm_s16le -f wav pipe:1
 *
 * ffmpegPath được set 1 lần khi module khởi động (ConfigService → AudioConverter.init).
 * Để deploy Linux/Docker: đặt FFMPEG_PATH=ffmpeg (ffmpeg phải có trong PATH).
 */
export class AudioConverter {
  private static ffmpegPath = 'ffmpeg'; // default — override bằng init()

  static init(ffmpegBinaryPath: string): void {
    AudioConverter.ffmpegPath = ffmpegBinaryPath;
    ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  }

  /**
   * PCM 16-bit signed LE → WAV 16kHz mono.
   * @param pcmBuffer    Raw PCM bytes từ browser/VAD
   * @param inputRate    Sample rate của input (thường 48000 — browser default)
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
        .inputOptions([
          '-f s16le',           // raw PCM signed 16-bit little-endian
          `-ar ${inputRate}`,   // sample rate của input
          '-ac 1',              // mono
        ])
        .outputOptions([
          '-ar 16000',          // resample → 16kHz
          '-ac 1',              // mono
          '-c:a pcm_s16le',     // codec
        ])
        .format('wav')
        .on('error', (err: Error) => reject(err))
        .pipe(output, { end: true });
    });
  }
}
