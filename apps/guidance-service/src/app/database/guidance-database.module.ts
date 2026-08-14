import { Global, Module } from '@nestjs/common';
import { GuidancePrismaService } from './guidance-prisma.service';

@Global()
@Module({
  providers: [GuidancePrismaService],
  exports: [GuidancePrismaService],
})
export class GuidanceDatabaseModule {}
