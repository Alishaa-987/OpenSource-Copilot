import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { RedisService } from "../redis/redis.service";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

type LocalEntry = { count: number; expiresAt: number };

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly local = new Map<string, LocalEntry>();
  private warnedRedisFallback = false;

  constructor(private readonly redis: RedisService) {}

  async consume(subject: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const safeLimit = Math.max(1, Math.min(10000, Math.floor(limit)));
    const safeWindow = Math.max(1, Math.min(86400, Math.floor(windowSeconds)));
    const key = "osc:rate:v1:" + createHash("sha256").update(subject).digest("hex");
    try {
      const client = this.redis.getClient();
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, safeWindow);
      const ttl = await client.ttl(key);
      return { allowed: count <= safeLimit, limit: safeLimit, remaining: Math.max(0, safeLimit - count), retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : safeWindow) };
    } catch {
      if (!this.warnedRedisFallback) {
        this.warnedRedisFallback = true;
        this.logger.warn("Redis unavailable for rate limiting; using bounded process-local fallback");
      }
      return this.consumeLocal(key, safeLimit, safeWindow);
    }
  }

  private consumeLocal(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    for (const [entryKey, entry] of this.local) if (entry.expiresAt <= now) this.local.delete(entryKey);
    if (this.local.size >= 10000) {
      const first = this.local.keys().next().value as string | undefined;
      if (first) this.local.delete(first);
    }
    const existing = this.local.get(key);
    const entry = existing && existing.expiresAt > now ? existing : { count: 0, expiresAt: now + windowSeconds * 1000 };
    entry.count += 1;
    this.local.set(key, entry);
    return { allowed: entry.count <= limit, limit, remaining: Math.max(0, limit - entry.count), retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)) };
  }
}
