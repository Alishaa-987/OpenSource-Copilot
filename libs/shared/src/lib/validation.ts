import { ValidationPipe } from '@nestjs/common';

/**
 * Builds the global validation pipe used by every service.
 *
 * Security posture (see project constraints "Validate all external input",
 * "Use safe defaults", "least privilege"):
 *  - `whitelist` strips any property not declared on the DTO,
 *  - `forbidNonWhitelisted` rejects requests that send unknown properties,
 *  - `transform` produces real DTO instances (with declared types),
 *  - `validationError: { target: false, value: false }` keeps the *submitted
 *    input* out of error responses, so we never echo attacker-controlled or
 *    sensitive values back to the client.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    validationError: { target: false, value: false },
  });
}
