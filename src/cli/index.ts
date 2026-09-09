#!/usr/bin/env node
import { createCommand } from './command.js';

createCommand()
  .parseAsync()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
