import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectContext } from '../project/context.js';
import { parseManifest } from '../project/context.js';
import { Stopped } from '../orchestration/stopped.js';

export type SvResult = { exitCode: number; signal?: NodeJS.Signals };

async function executable(): Promise<string> {
  // Resolve the installed dependency's declared bin, including in packed installs.
  let directory = dirname(fileURLToPath(import.meta.resolve('sv')));
  for (;;) {
    try {
      const metadata = JSON.parse(
        await readFile(resolve(directory, 'package.json'), 'utf8'),
      );
      if (metadata.name === 'sv') {
        const bin =
          typeof metadata.bin === 'string' ? metadata.bin : metadata.bin?.sv;
        if (typeof bin !== 'string')
          throw new Error('The sv dependency has no CLI executable.');
        return resolve(directory, bin);
      }
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error('Could not locate the installed sv CLI.');
    directory = parent;
  }
}

export async function sveltePackage(context: ProjectContext): Promise<string> {
  if (!context.packageRoot)
    throw new Stopped(
      'unsupported',
      'sv add requires a Svelte package. Select its directory with --cwd.',
    );
  const path = resolve(context.packageRoot, 'package.json');
  const manifest = parseManifest(await readFile(path, 'utf8'), path).data;
  const dependencies = [manifest.dependencies, manifest.devDependencies];
  if (
    !dependencies.some(
      (deps) =>
        deps &&
        typeof deps === 'object' &&
        'svelte' in deps &&
        typeof deps.svelte === 'string',
    )
  )
    throw new Stopped(
      'unsupported',
      `sv add requires a Svelte dependency in ${path}. Select a Svelte app with --cwd; workspace roots do not select a child app automatically.`,
    );
  return context.packageRoot;
}

export async function delegateSvAdd(
  context: ProjectContext,
  packageRoot: string,
  args: readonly string[],
): Promise<SvResult> {
  for (const arg of args) {
    if (arg === '--') break;
    if (arg === '--cwd' || arg.startsWith('--cwd=') || arg.startsWith('-C'))
      throw new Stopped(
        'unsupported',
        'Set the target through request.cwd, not upstream arguments, so Svelte compatibility is checked before delegation.',
      );
  }
  const entry = await executable();
  process.stdout.write(
    `Delegating to sv add in ${packageRoot}: ${args.map((arg) => JSON.stringify(arg)).join(' ')}\n`,
  );
  return new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [entry, 'add', '--cwd', packageRoot, ...args],
      {
        cwd: context.target,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('close', (code, signal) =>
      accept({ exitCode: code ?? 1, ...(signal ? { signal } : {}) }),
    );
  });
}
