import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads `.env` files into `process.env` for local development convenience.
 *
 * Precedence, highest first (dotenv never overwrites an already-set variable,
 * so the first file to define a key wins, and real platform env always wins):
 *
 *   .env.<NODE_ENV>.local → .env.local → .env.<NODE_ENV> → .env
 *
 * In production these files are simply absent — variables come from the
 * platform — so this is a no-op there.
 *
 * @returns the relative names of the files that were actually loaded.
 */
export function loadEnvFiles(cwd: string = process.cwd()): string[] {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const loaded: string[] = [];

  const candidates = [`.env.${nodeEnv}.local`, `.env.local`, `.env.${nodeEnv}`, `.env`];
  for (const file of candidates) {
    const path = resolve(cwd, file);
    if (existsSync(path)) {
      loadDotenv({ path });
      loaded.push(file);
    }
  }
  return loaded;
}
