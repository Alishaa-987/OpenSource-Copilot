/**
 * `@osc/contracts` — types and helpers shared across services and (where
 * relevant) the frontend contract. Contains ONLY genuinely shared, business-
 * logic-free foundation: correlation constants, the uniform API error shape,
 * and the Kafka domain-event envelope + naming/versioning machinery.
 */
export * from './lib/correlation';
export * from './lib/api-error';
export * from './lib/events/event-envelope';
export * from './lib/events/event-names';
export * from './lib/events/create-event';
