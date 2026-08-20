import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { ChatMessage, LlmProvider } from './ai.types';

interface CompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

@Injectable()
export class GroqLLMProvider implements LlmProvider {
  private readonly client: AxiosInstance;

  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {
    this.client = axios.create({
      baseURL: this.config.get('GROQ_BASE_URL').replace(/\/$/, ''),
      timeout: this.config.get('AI_REQUEST_TIMEOUT_MS'),
      maxContentLength: 1_000_000,
      maxBodyLength: 1_000_000,
      maxRedirects: 0,
    });
  }

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    const apiKey = this.config.get('GROQ_API_KEY');
    if (!apiKey) throw new Error('Groq provider is not configured');

    const response = await this.client.post<CompletionResponse>('/chat/completions', {
      model: this.config.get('GROQ_MODEL'),
      messages,
      temperature: 0.1,
    }, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 12_000) {
      throw new Error('Groq provider returned an invalid response');
    }
    return content.trim();
  }
}
