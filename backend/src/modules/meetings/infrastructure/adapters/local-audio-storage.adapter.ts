import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream, unlinkSync, WriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ILocalAudioStoragePort } from '../../domain/ports/local-audio-storage.port';

@Injectable()
export class LocalAudioStorageAdapter implements ILocalAudioStoragePort {
  private readonly logger  = new Logger(LocalAudioStorageAdapter.name);
  private readonly streams = new Map<string, { stream: WriteStream; path: string }>();

  /** Khởi tạo write stream mới cho meeting. Gọi khi bắt đầu phiên. */
  initStream(meetingId: string): void {
    const filePath = join(tmpdir(), `audio-${meetingId}.pcm`);
    const stream   = createWriteStream(filePath, { flags: 'w' });
    this.streams.set(meetingId, { stream, path: filePath });
    this.logger.debug(`LocalAudio stream opened: ${filePath}`);
  }

  async append(meetingId: string, chunk: Buffer): Promise<void> {
    const entry = this.streams.get(meetingId);
    if (!entry) return;
    await new Promise<void>((resolve, reject) => {
      entry.stream.write(chunk, err => (err ? reject(err) : resolve()));
    });
  }

  async close(meetingId: string): Promise<string> {
    const entry = this.streams.get(meetingId);
    if (!entry) throw new Error(`No audio stream for meeting ${meetingId}`);
    await new Promise<void>((resolve, reject) => {
      entry.stream.end((err: Error | null | undefined) => (err ? reject(err) : resolve()));
    });
    this.streams.delete(meetingId);
    this.logger.debug(`LocalAudio stream closed: ${entry.path}`);
    return entry.path;
  }

  async remove(filePath: string): Promise<void> {
    try { unlinkSync(filePath); }
    catch (err) { this.logger.warn(`Cannot remove temp file ${filePath}: ${err}`); }
  }
}
