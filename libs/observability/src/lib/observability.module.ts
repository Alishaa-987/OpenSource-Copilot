import { Controller, DynamicModule, Get, Global, Header, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { CorrelationService } from "./correlation.service";
import { buildLoggerParams, LoggerOptions } from "./logger.options";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  getMetrics(): string {
    return this.metrics.renderPrometheus();
  }
}

@Global()
@Module({})
export class ObservabilityModule {
  static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: ObservabilityModule,
      imports: [LoggerModule.forRoot(buildLoggerParams(options))],
      controllers: [MetricsController],
      providers: [CorrelationService, MetricsService],
      exports: [CorrelationService, MetricsService, LoggerModule],
    };
  }
}
