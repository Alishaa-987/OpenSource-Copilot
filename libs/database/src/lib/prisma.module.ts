import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module exposing {@link PrismaService}. Imported once by a schema-owning
 * service (currently `repository-service`); the service then injects
 * `PrismaService` wherever it needs database access.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
