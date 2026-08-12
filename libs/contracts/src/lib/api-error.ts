/**
 * Uniform error response returned by every backend service.
 *
 * The global exception filter (see `@osc/shared`) serialises *all* errors into
 * this shape, so the frontend can depend on a single, stable contract and
 * internal details (stack traces, driver errors, secrets) never leak to
 * clients. This mirrors the security requirement: "Do not return sensitive
 * internal errors to clients."
 */
export interface ApiErrorResponse {
  /** HTTP status code, mirrored in the response status line. */
  statusCode: number;
  /** Short, safe, human-readable reason phrase, e.g. `Bad Request`. */
  error: string;
  /**
   * Client-safe message(s). Validation failures produce an array of per-field
   * messages; other errors produce a single string. For 5xx responses this is
   * a generic message — never raw exception text.
   */
  message: string | string[];
  /** Correlation id for cross-referencing the originating request in logs. */
  correlationId: string;
  /** ISO-8601 timestamp of when the error response was produced. */
  timestamp: string;
  /** Request path that produced the error. */
  path: string;
}
