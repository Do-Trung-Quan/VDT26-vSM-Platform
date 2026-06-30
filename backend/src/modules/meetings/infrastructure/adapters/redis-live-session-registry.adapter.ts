import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/redis/redis.provider';
import { ILiveSessionRegistryPort } from '../../domain/ports/live-session-registry.port';

const GLOBAL_COUNT_KEY  = 'live_sessions:count';
const USER_SESSIONS_KEY = (uid: string) => `live_sessions:user:${uid}`;

@Injectable()
export class RedisLiveSessionRegistryAdapter implements ILiveSessionRegistryPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async countLive(): Promise<number> {
    const val = await this.redis.get(GLOBAL_COUNT_KEY);
    return val ? parseInt(val, 10) : 0;
  }

  async increment(): Promise<void> {
    await this.redis.incr(GLOBAL_COUNT_KEY);
  }

  async decrement(): Promise<void> {
    await this.redis.decr(GLOBAL_COUNT_KEY);
  }

  async addUserSession(userId: string, meetingId: string): Promise<void> {
    await this.redis.sadd(USER_SESSIONS_KEY(userId), meetingId);
  }

  async removeUserSession(userId: string, meetingId: string): Promise<void> {
    await this.redis.srem(USER_SESSIONS_KEY(userId), meetingId);
  }

  async countUserSessions(userId: string): Promise<number> {
    return this.redis.scard(USER_SESSIONS_KEY(userId));
  }
}
