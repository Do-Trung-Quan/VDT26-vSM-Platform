import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().default(10),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  STORAGE_ENDPOINT: Joi.string().required(),
  STORAGE_PORT: Joi.number().default(9000),
  STORAGE_USE_SSL: Joi.boolean().default(false),
  STORAGE_ACCESS_KEY: Joi.string().required(),
  STORAGE_SECRET_KEY: Joi.string().required(),
  STORAGE_BUCKET: Joi.string().required(),
  STORAGE_REGION: Joi.string().default('us-east-1'),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASSWORD: Joi.string().required(),
  SMTP_FROM: Joi.string().required(),

  AI_SPEECH_TO_TEXT_URL: Joi.string().uri().required(),
  AI_SPEAKER_IDENTIFY_URL: Joi.string().uri().required(),
  AI_API_KEY: Joi.string().required(),
  AI_TIMEOUT_MS: Joi.number().default(10000),

  LIVE_RESUME_TTL_SECONDS: Joi.number().default(120),
  LIVE_MAX_CONCURRENT_SESSIONS: Joi.number().default(20),
  AI_MAX_CONCURRENCY: Joi.number().default(5),
  VAD_SILENCE_THRESHOLD_MS: Joi.number().default(600),
});
