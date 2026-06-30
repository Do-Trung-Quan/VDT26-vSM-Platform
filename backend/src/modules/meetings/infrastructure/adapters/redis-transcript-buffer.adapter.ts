import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/redis/redis.provider';
import { ITranscriptBufferPort } from '../../domain/ports/transcript-buffer.port';
import { TranscriptBlock } from '../../domain/entities/transcript-block.entity';

const BUFFER_KEY   = (id: string) => `transcript_buffer:${id}`;
const RESUME_KEY   = (id: string) => `resume_window:${id}`;

@Injectable()
export class RedisTranscriptBufferAdapter implements ITranscriptBufferPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async allocate(meetingId: string): Promise<void> {
    await this.redis.del(BUFFER_KEY(meetingId));
  }

  async push(meetingId: string, block: TranscriptBlock): Promise<void> {
    await this.redis.rpush(BUFFER_KEY(meetingId), JSON.stringify(block));
  }

  async getAfter(meetingId: string, afterSeq: number): Promise<TranscriptBlock[]> {
    const raw = await this.redis.lrange(BUFFER_KEY(meetingId), 0, -1);
    return raw
      .map(s => JSON.parse(s) as TranscriptBlock)
      .filter(b => b.sequenceNumber > afterSeq);
  }

  async drainAll(meetingId: string): Promise<TranscriptBlock[]> {
    const raw = await this.redis.lrange(BUFFER_KEY(meetingId), 0, -1);
    return raw.map(s => JSON.parse(s) as TranscriptBlock);
  }

  async cleanup(meetingId: string): Promise<void> {
    await this.redis.del(BUFFER_KEY(meetingId));
  }

  async setResumeTtl(meetingId: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(RESUME_KEY(meetingId), '1', 'EX', ttlSeconds);
  }

  async clearResumeTtl(meetingId: string): Promise<void> {
    await this.redis.del(RESUME_KEY(meetingId));
  }

  async isResumable(meetingId: string): Promise<boolean> {
    return (await this.redis.exists(RESUME_KEY(meetingId))) === 1;
  }
}
