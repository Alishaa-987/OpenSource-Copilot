/**
 * `@osc/database` — reusable PostgreSQL/Prisma infrastructure.
 *
 * Provides a lifecycle-managed `PrismaService` and a global `PrismaModule`.
 * The schema itself is owned by the consuming service (repository-service).
 */
export * from './lib/prisma.service';
export * from './lib/prisma.module';
