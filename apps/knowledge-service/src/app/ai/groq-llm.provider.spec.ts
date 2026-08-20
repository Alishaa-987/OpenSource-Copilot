import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { GroqLLMProvider } from './groq-llm.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GroqLLMProvider', () => {
  const values = {
    GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
    GROQ_API_KEY: 'server-secret',
    GROQ_MODEL: 'test-model',
    AI_REQUEST_TIMEOUT_MS: 30_000,
  };
  const config = { get: (key: string) => values[key as keyof typeof values] } as unknown as TypedConfigService<KnowledgeEnv>;

  beforeEach(() => jest.clearAllMocks());

  it('returns trimmed content and sends the configured Groq model', async () => {
    mockedAxios.create.mockReturnValue({ post: jest.fn().mockResolvedValue({ data: { choices: [{ message: { content: '  grounded answer  ' } }] } }) } as never);
    const provider = new GroqLLMProvider(config);
    await expect(provider.complete([{ role: 'user', content: 'question' }])).resolves.toBe('grounded answer');
    const client = mockedAxios.create.mock.results[0]?.value as { post: jest.Mock };
    expect(client.post).toHaveBeenCalledWith('/chat/completions', expect.objectContaining({ model: 'test-model', temperature: 0.1 }), expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer server-secret' }) }));
  });

  it('fails closed without an API key', async () => {
    const missing = { get: (key: string) => key === 'GROQ_BASE_URL' ? values.GROQ_BASE_URL : key === 'GROQ_MODEL' ? values.GROQ_MODEL : key === 'AI_REQUEST_TIMEOUT_MS' ? values.AI_REQUEST_TIMEOUT_MS : undefined } as unknown as TypedConfigService<KnowledgeEnv>;
    const provider = new GroqLLMProvider(missing);
    await expect(provider.complete([])).rejects.toThrow('not configured');
  });
});
