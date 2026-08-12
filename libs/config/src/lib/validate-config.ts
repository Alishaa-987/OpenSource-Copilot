import { z, ZodError } from 'zod';

/**
 * Thrown when environment validation fails. Carries the list of problems so a
 * caller (or test) can inspect them. The message NEVER echoes the offending
 * values, so secrets cannot leak into logs or crash reports.
 */
export class ConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((i) => `  - ${i}`)
        .join('\n')}\nSet the required variables (see .env.example) and restart.`,
    );
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

/**
 * Validates `source` (defaults to `process.env`) against `schema` and returns a
 * fully-typed, defaulted, coerced config object.
 *
 * Throws {@link ConfigValidationError} on the first invalid configuration,
 * listing every problem at once. This is the fail-fast entry point used by
 * {@link AppConfigModule} at startup.
 */
export function validateConfig<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, unknown> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new ConfigValidationError(formatIssues(result.error));
  }
  return result.data;
}

/** Formats zod issues as `path: message`, sorted for stable output. Values are omitted on purpose. */
function formatIssues(error: ZodError): string[] {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message}`;
    })
    .sort((a, b) => a.localeCompare(b));
}
