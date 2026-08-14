import { z } from 'zod';
import { baseEnvSchema, kafkaEnvSchema, redisEnvSchema } from '@osc/config';

export const guidanceEnvSchema = baseEnvSchema
.merge(redisEnvSchema)
.merge(kafkaEnvSchema)
.extend({
    PORT: z.coerce.number().int().min(1).max(65_535).default(3002),
    KAFKA_CONSUMER_GROUP: z.string().min(1).default('guidance-service'),
    KAFKA_CONSUMER_FROM_BEGINNING: z.coerce.boolean().default(false),
    KAFKA_CONSUMER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    KAFKA_CONSUMER_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(60_000).default(100),
  });

export type GuidanceEnv = z.infer<typeof guidanceEnvSchema>;
