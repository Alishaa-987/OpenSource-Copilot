import { z } from 'zod';
import { baseEnvSchema, kafkaEnvSchema, redisEnvSchema } from '@osc/config';

export const knowledgeEnvSchema = baseEnvSchema.merge(kafkaEnvSchema).merge(redisEnvSchema).extend({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3003),
  REPOSITORY_SERVICE_URL: z.string().url().default('http://localhost:3001/api'),
  KNOWLEDGE_SERVICE_TOKEN: z.string().min(32).optional(),
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).default('opensource_repository_chunks'),
  EMBEDDING_BASE_URL: z.string().url().optional(),
  EMBEDDING_API_KEY: z.string().min(1).optional(),
  EMBEDDING_MODEL: z.string().min(1).max(200).default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().min(1).max(8192).default(1536),
  EMBEDDING_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).max(200).default('llama-3.3-70b-versatile'),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).max(200).default('gpt-4o-mini'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  KNOWLEDGE_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
  KNOWLEDGE_RETRIEVAL_LIMIT: z.coerce.number().int().min(1).max(20).default(5),
  KNOWLEDGE_CHUNK_SIZE: z.coerce.number().int().min(200).max(20_000).default(1_200),
  KNOWLEDGE_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(2_000).default(150),
  KNOWLEDGE_MIN_RELEVANCE: z.coerce.number().min(0).max(1).default(0.35),
  KAFKA_CONSUMER_FROM_BEGINNING: z.coerce.boolean().default(false),
  KAFKA_CONSUMER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
});

export type KnowledgeEnv = z.infer<typeof knowledgeEnvSchema>;

