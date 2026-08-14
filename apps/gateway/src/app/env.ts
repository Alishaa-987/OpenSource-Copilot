import { z } from 'zod';
import { baseEnvSchema, kafkaEnvSchema, redisEnvSchema } from '@osc/config';

export const gatewayEnvSchema = baseEnvSchema
  .merge(redisEnvSchema)
  .merge(kafkaEnvSchema)
  .extend({
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  });

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

