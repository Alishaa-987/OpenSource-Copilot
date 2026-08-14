import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Generic health indicator that reports `up`/`down` from an arbitrary async
 * probe. Owning libs expose a cheap liveness probe (e.g. `RedisService.ping`,
 * `PrismaService.ping`, a Kafka admin call) and each service composes only the
 * probes for dependencies it actually uses — a service never health-checks
 * another service's datastore (least privilege).
 *
 * A probe that throws or resolves falsy yields `down` with a **generic** reason;
 * the underlying error is logged server-side and never surfaced to the client,
 * consistent with "Do not return sensitive internal errors to clients".
 */
@Injectable()
export class ServiceHealthIndicator {
  private readonly logger = new Logger(ServiceHealthIndicator.name);

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async check(key: string, probe: () => Promise<boolean>): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const healthy = await probe();
      return healthy ? indicator.up() : indicator.down({ message: 'unavailable' });
    } catch (err) {
      this.logger.warn(
        `Health probe "${key}" failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return indicator.down({ message: 'unavailable' });
    }
  }
}
