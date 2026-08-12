import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from './tokens';

/**
 * Thin, strongly-typed accessor over the validated config object.
 *
 * Inject it and parameterise with your service's env type:
 *
 * ```ts
 * constructor(private readonly config: TypedConfigService<GatewayEnv>) {}
 * const port = this.config.get('PORT'); // typed as number
 * ```
 */
@Injectable()
export class TypedConfigService<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(@Inject(APP_CONFIG) private readonly config: T) {}

  /** Returns a single, typed config value. */
  get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  /** Returns the whole validated config object (read-only). */
  getAll(): Readonly<T> {
    return this.config;
  }
}
