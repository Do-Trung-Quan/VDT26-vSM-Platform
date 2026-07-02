import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmPort } from '../../domain/ports/llm.port';

@Injectable()
export class GeminiLlmAdapter implements ILlmPort {
  private readonly logger = new Logger(GeminiLlmAdapter.name);

  constructor(private readonly config: ConfigService) { }

  async summarize(prompt: string): Promise<string> {
    const apiKey = this.config.get<string>('ai.llmApiKey');
    const model = this.config.get<string>('ai.llmModel') ?? 'gemini-1.5-flash';

    if (!apiKey) throw new Error('LLM_API_KEY chưa được cấu hình');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      },
      { timeout: 60_000 },
    );

    const text: string | undefined =
      resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text?.trim()) throw new Error('Gemini trả về kết quả rỗng');

    this.logger.debug(`[Gemini] response length: ${text.length} chars`);
    return text.trim();
  }
}
