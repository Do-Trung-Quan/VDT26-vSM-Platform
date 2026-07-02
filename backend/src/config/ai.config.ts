import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  speechToTextUrl: process.env.AI_SPEECH_TO_TEXT_URL,
  speakerIdentifyUrl: process.env.AI_SPEAKER_IDENTIFY_URL,
  apiKey: process.env.AI_API_KEY,
  timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? '10000', 10),
  // LLM Summary (Phase 7)
  llmProvider: process.env.LLM_PROVIDER ?? 'gemini',
  llmApiKey:   process.env.LLM_API_KEY   ?? '',
  llmModel:    process.env.LLM_MODEL     ?? 'gemini-1.5-flash',
}));
