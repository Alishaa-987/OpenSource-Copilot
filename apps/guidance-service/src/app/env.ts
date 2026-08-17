import { z } from 'zod';
import { baseEnvSchema, kafkaEnvSchema, redisEnvSchema } from '@osc/config';

export const guidanceEnvSchema = baseEnvSchema
  .merge(redisEnvSchema)
  .merge(kafkaEnvSchema)
  .extend({
    GUIDANCE_DATABASE_URL: z.string().min(1).refine((u) => u.startsWith("postgres://") || u.startsWith("postgresql://"), "GUIDANCE_DATABASE_URL must be a postgres connection string"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3002),
    KAFKA_CONSUMER_GROUP: z.string().min(1).default('guidance-service'),
    KAFKA_CONSUMER_FROM_BEGINNING: z.coerce.boolean().default(false),
    KAFKA_CONSUMER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    KAFKA_CONSUMER_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(100),
    REPOSITORY_SERVICE_BASE_URL: z.string().url().default('http://localhost:3001'),
    KNOWLEDGE_SERVICE_BASE_URL: z.string().url().default('http://localhost:3003'),
    CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
    RECOMMENDATION_RECENT_ACTIVITY_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    RECOMMENDATION_LOW_DISCUSSION_MAX: z.coerce.number().int().min(0).max(1000).default(3),
    RECOMMENDATION_HIGH_DISCUSSION_MIN: z.coerce.number().int().min(1).max(100000).default(20),
  });

export type GuidanceEnv = z.infer<typeof guidanceEnvSchema>;
