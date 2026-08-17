import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PrismaClient } from '../../../../../libs/guidance-database/generated';

@Injectable()
export class GuidancePrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GuidancePrismaService.name);

  constructor() {
    const datasourceUrl = process.env["GUIDANCE_DATABASE_URL"];
    if (!datasourceUrl) throw new Error("GUIDANCE_DATABASE_URL is required before Prisma initialization");
    super({ datasourceUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Guidance Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async ping(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
