import { readFileSync } from 'node:fs';

// Keep the package manifest as the authoritative version for both the CLI and
// the recreation command it records.
export const version = (JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }).version;
