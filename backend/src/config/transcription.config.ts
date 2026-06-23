import { registerAs } from '@nestjs/config';

export default registerAs('transcription', () => ({
  resumeTtlSeconds: parseInt(process.env.LIVE_RESUME_TTL_SECONDS ?? '120', 10),
  maxConcurrentLiveSessions: parseInt(
    process.env.LIVE_MAX_CONCURRENT_SESSIONS ?? '20',
    10,
  ),
  aiMaxConcurrency: parseInt(process.env.AI_MAX_CONCURRENCY ?? '5', 10),
  vadSilenceThresholdMs: parseInt(
    process.env.VAD_SILENCE_THRESHOLD_MS ?? '600',
    10,
  ),
}));
