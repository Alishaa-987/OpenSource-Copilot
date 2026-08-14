import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const REPOSITORY_IMPORTED_EVENT_TYPE = 'RepositoryImported' as const;
export const REPOSITORY_IMPORTED_EVENT_VERSION = 1 as const;
export const REPOSITORY_IMPORTED_EVENT_NAME = 'repository.imported' as const;
export const REPOSITORY_IMPORTED_TOPIC = 'repository' as const;

/**
 * Immutable wire event published after repository-service completes an import.
 * It intentionally contains identifiers and tracing metadata only: no tokens,
 * credentials, repository contents, or other GitHub response data are sent.
 */
export interface RepositoryImportedEvent {
  readonly eventId: string;
  readonly eventType: typeof REPOSITORY_IMPORTED_EVENT_TYPE;
  readonly version: typeof REPOSITORY_IMPORTED_EVENT_VERSION;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly repositoryId: string;
  readonly githubRepositoryId: string;
}

export const RepositoryImportedEventSchema = z
.object({
    eventId: z.string().uuid(),
    eventType: z.literal(REPOSITORY_IMPORTED_EVENT_TYPE),
    version: z.literal(REPOSITORY_IMPORTED_EVENT_VERSION),
    timestamp: z.string().datetime({ offset: true }),
    correlationId: z.string().min(1).max(200),
    repositoryId: z.string().uuid(),
    githubRepositoryId: z.string().regex(/^\d+$/),
  })
.strict();

export type RepositoryImportedEventInput = Omit<
  RepositoryImportedEvent,
  'eventId' | 'eventType' | 'version' | 'timestamp'
> &
  Partial<Pick<RepositoryImportedEvent, 'eventId' | 'timestamp'>>;

export function createRepositoryImportedEvent(
  input: RepositoryImportedEventInput,
): RepositoryImportedEvent {
  const parsed = RepositoryImportedEventSchema.parse({
    eventId: input.eventId ?? randomUUID(),
    eventType: REPOSITORY_IMPORTED_EVENT_TYPE,
    version: REPOSITORY_IMPORTED_EVENT_VERSION,
    timestamp: input.timestamp ?? new Date().toISOString(),
    correlationId: input.correlationId,
    repositoryId: input.repositoryId,
    githubRepositoryId: input.githubRepositoryId,
  });
  return Object.freeze(parsed) as RepositoryImportedEvent;
}

export function parseRepositoryImportedEvent(value: unknown): RepositoryImportedEvent {
  return Object.freeze(RepositoryImportedEventSchema.parse(value)) as RepositoryImportedEvent;
}
