import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ServiceHealthIndicator } from './service-health.indicator'

@Module({
  imports: [TerminusModule],
  providers: [ServiceHealthIndicator],
  exports: [TerminusModule, ServiceHealthIndicator],
})
export class HealthModule {}

