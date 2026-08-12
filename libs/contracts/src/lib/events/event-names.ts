/**
 * Event-naming convention.
 *
 * Names use `<aggregate>.<action>` with lower-kebab segments and a past-tense
 * action, e.g. `repository.imported`, `issue.recommendation-generated`.
 *
 * NOTE: No business events are registered during the Phase-1 foundation. This
 * module defines the *convention and helpers only*; concrete event names are
 * added alongside the features that emit them. Keeping the machinery here (and
 * out of individual services) is what makes it "genuinely shared".
 */

/**
 * Matches one-or-more dot-separated lower-kebab segments, with at least two
 * segments (aggregate + action). Each segment starts with a letter.
 */
export const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)+$/;

/** Returns true when `name` satisfies the event-naming convention. */
export function isValidEventName(name: string): boolean {
  return EVENT_NAME_PATTERN.test(name);
}

/** Throws a descriptive error when `name` violates the naming convention. */
export function assertEventName(name: string): void {
  if (!isValidEventName(name)) {
    throw new Error(
      `Invalid event name "${name}". Expected "<aggregate>.<action>" using ` +
        `lower-kebab segments, e.g. "repository.imported".`,
    );
  }
}

/**
 * Derives the Kafka topic for an event name. The aggregate (first segment) is
 * used as the topic so all events for one aggregate share an ordered partition
 * space, e.g. `repository.imported` -> `repository`.
 */
export function topicForEventName(name: string): string {
  assertEventName(name);
  return name.split('.')[0];
}
