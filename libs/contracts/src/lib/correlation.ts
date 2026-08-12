/**
 * Header used to propagate a correlation id across HTTP calls and, from there,
 * into any Kafka events produced while handling the request.
 *
 * Lower-case on purpose: Node normalises incoming HTTP header names to
 * lower-case, so using the same casing everywhere avoids lookup bugs.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Key under which the correlation id is carried in Kafka message headers.
 */
export const CORRELATION_ID_KAFKA_HEADER = 'correlationId';
