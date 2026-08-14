import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Reusable Prisma lifecycle wrapper.
 *
 * Extends the generated `PrismaClient` and manages its connection with the Nest
 * lifecycle: connect on module init, disconnect on shutdown. The connection
 * string comes from `DATABASE_URL` (declared in the schema's datasource and
 * validated at startup by `databaseEnvSchema` in `@osc/config`) — there is no
 * hard-coded fallback.
 *
 * Only services that own a schema (currently `repository-service`) provide this.
 * Other services must NOT reach into this database directly.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Liveness probe for the health check. Runs a trivial query; throws if the
   * database is unreachable (the caller — `ServiceHealthIndicator` — turns that
   * into a `down` result without leaking the underlying error).
   */
  async ping(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
