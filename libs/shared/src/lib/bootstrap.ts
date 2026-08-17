import { DynamicModule, INestApplication, Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import type { NextFunction, Request, Response } from "express";
import { TypedConfigService } from "@osc/config";
import { Logger, correlationMiddleware, MetricsService } from "@osc/observability";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { buildValidationPipe } from "./validation";
import { RateLimitService } from "./rate-limit/rate-limit.service";

export interface BootstrapOptions {
  serviceName: string;
  port: number;
  globalPrefix?: string;
}

function isExemptFromRateLimit(path: string): boolean {
  return path.endsWith("/health/live") || path.endsWith("/metrics");
}

export async function bootstrapService(appModule: Type<unknown> | DynamicModule, options: BootstrapOptions): Promise<INestApplication> {
  const app = await NestFactory.create(appModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));
  app.use(json({ limit: "100kb", strict: true }));
  app.use(urlencoded({ extended: false, limit: "100kb" }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    next();
  });
  app.use(correlationMiddleware);
  const metrics = app.get(MetricsService);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.once("finish", () => {
      metrics.recordHttpRequest(request.method, request.path || request.url, response.statusCode, Date.now() - startedAt);
    });
    next();
  });
  const config = app.get(TypedConfigService) as TypedConfigService<Record<string, unknown>>;
  const limiter = app.get(RateLimitService);
  const enabled = config.get("RATE_LIMIT_ENABLED") as boolean;
  const maxRequests = config.get("RATE_LIMIT_MAX_REQUESTS") as number;
  const windowSeconds = config.get("RATE_LIMIT_WINDOW_SECONDS") as number;
  if (enabled) {
    app.use(async (request: Request, response: Response, next: NextFunction) => {
      if (isExemptFromRateLimit(request.path || request.url)) { next(); return; }
      const address = request.socket.remoteAddress || request.ip || "unknown";
      const subject = address + "|" + (request.path || request.url).split("?")[0];
      const result = await limiter.consume(subject, maxRequests, windowSeconds);
      response.setHeader("X-RateLimit-Limit", String(result.limit));
      response.setHeader("X-RateLimit-Remaining", String(result.remaining));
      if (!result.allowed) {
        response.setHeader("Retry-After", String(result.retryAfterSeconds));
        response.status(429).json({ code: "RATE_LIMITED", message: "Too many requests" });
        return;
      }
      next();
    });
  }
  const prefix = options.globalPrefix || "api";
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  await app.listen(options.port);
  app.get(Logger).log(options.serviceName + " listening on port " + options.port + " (prefix /" + prefix + ")", "Bootstrap");
  return app;
}
