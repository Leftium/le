import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { add, create, officialAddons } from 'sv';
import { runAdd } from './add.js';
import { resolveNewLicenseRequest } from '../addons/license/index.js';
import { version } from '../version.js';

const execFileAsync = promisify(execFile);

// Compatibility note: sv 0.17.0 exposes synchronous `create` and async `add`.
// Neither public API installs dependencies, so this orchestrator can defer one
// install until its Svelte and Leftium transforms have completed.

export type CreateRequest = {
  cwd: string;
  template?: 'minimal';
  types?: 'typescript' | 'checkjs' | 'none';
  addons?: string[];
  author?: string;
  year?: string;
  packageManager?: 'npm' | 'pnpm';
  install?: boolean;
};

export type CreateStep =
  'scaffold' | 'add-ons' | 'installation' | 'verification' | 'recipe';
export type CreateFailureResult = {
  status: 'failed';
  destination: string;
  completed: CreateStep[];
  filesRemain: boolean;
  installation:
    'not-requested' | 'not-started' | 'started' | 'completed' | 'failed';
  recipeWritten: boolean;
  message: string;
  nextStep: string;
};

export class CreateFailure extends Error {
  constructor(
    public readonly result: CreateFailureResult,
    cause: unknown,
  ) {
    super(
      `${result.message}\nDestination: ${result.destination}\nCompleted: ${result.completed.join(', ') || 'none'}\nFiles remain: ${result.filesRemain ? 'yes' : 'no'}\nInstallation: ${result.installation}\nRecipe written: ${result.recipeWritten ? 'yes' : 'no'}\nNext step: ${result.nextStep}`,
      { cause },
    );
    this.name = 'CreateFailure';
  }
}

async function installDependencies(
  packageManager: 'npm' | 'pnpm',
  cwd: string,
): Promise<string | undefined> {
  try {
    await execFileAsync(packageManager, ['install'], { cwd });
    return undefined;
  } catch (error: unknown) {
    const output =
      typeof error === 'object' && error !== null
        ? ['stdout', 'stderr'].flatMap((key) =>
            key in error && typeof error[key as keyof typeof error] === 'string'
              ? [error[key as keyof typeof error] as string]
              : [],
          )
        : [];
    if (
      packageManager === 'pnpm' &&
      output.join('\n').includes('ERR_PNPM_IGNORED_BUILDS')
    ) {
      return `pnpm skipped dependency build scripts.\n\nTo finish setup:\n  cd ${shell(cwd)}\n  pnpm approve-builds\n  pnpm install`;
    }
    throw error;
  }
}

export function shell(value: string): string {
  return /^[A-Za-z0-9_./:@-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}

type ResolvedCreateRequest = Required<
  Pick<
    CreateRequest,
    'cwd' | 'template' | 'types' | 'addons' | 'packageManager' | 'install'
  >
> &
  Pick<CreateRequest, 'author' | 'year'>;

export function recreationRecipeArgv(request: ResolvedCreateRequest): string[] {
  // A relative name makes the recorded command replayable from a fresh parent
  // directory instead of binding it to the original machine's absolute path.
  const launcher =
    request.packageManager === 'pnpm'
      ? ['pnpm', 'dlx', `leftium@${version}`]
      : ['npx', '--yes', `leftium@${version}`];
  const args = [
    ...launcher,
    'create',
    basename(request.cwd),
    '--template',
    `sv:${request.template}`,
    '--types',
    request.types,
  ];
  for (const addon of request.addons) args.push('--add', addon);
  if (request.author) args.push('--author', request.author);
  if (request.year) args.push('--year', request.year);
  if (request.install) args.push('--install', request.packageManager);
  else args.push('--no-install');
  return args;
}

export function renderRecipe(argv: readonly string[]): string {
  return argv.map(shell).join(' ');
}

async function writeRecipe(cwd: string, command: string): Promise<void> {
  const path = resolve(cwd, 'README.md');
  const readme = await readFile(path, 'utf8');
  const section = `## Leftium recreation\n\n<!-- leftium:creation-recipe -->\n\`\`\`sh\n${command}\n\`\`\`\n<!-- /leftium:creation-recipe -->\n\n`;
  // sv 0.17.0's public create API emits this bounded, generated setup section.
  // Replace it rather than leaving a competing partial `sv create` recipe.
  const next = readme.replace(
    /## Creating a project[\s\S]*?(?=## Developing)/,
    section,
  );
  if (next === readme)
    throw new Error("Could not identify sv's generated README setup section.");
  await writeFile(path, next);
}

async function executeCreate(
  input: CreateRequest,
): Promise<{ cwd: string; installed: boolean; warning?: string }> {
  const cwd = resolve(input.cwd);
  const baseRequest = {
    cwd,
    template: input.template ?? 'minimal',
    types: input.types ?? 'typescript',
    addons: input.addons ?? [],
    author: input.author,
    year: input.year,
    packageManager: input.packageManager ?? 'pnpm',
    install: input.install ?? true,
  } as const;
  if (baseRequest.template !== 'minimal')
    throw new Error(
      'The Svelte spike currently supports only --template sv:minimal.',
    );
  if (!['typescript', 'checkjs', 'none'].includes(baseRequest.types))
    throw new Error(`Unsupported --types value: ${baseRequest.types}`);
  if (!['npm', 'pnpm'].includes(baseRequest.packageManager))
    throw new Error(
      `Unsupported --package-manager value: ${baseRequest.packageManager}`,
    );
  if (
    baseRequest.addons.some(
      (addon) => addon !== 'prettier' && addon !== 'license',
    )
  )
    throw new Error(
      'The Svelte spike currently supports --add prettier and --add license.',
    );
  const license = baseRequest.addons.includes('license')
    ? await resolveNewLicenseRequest(baseRequest, dirname(cwd))
    : undefined;
  const request = { ...baseRequest, ...license } as const;
  const completed: CreateStep[] = [];
  let installation: CreateFailureResult['installation'] = request.install
    ? 'not-started'
    : 'not-requested';
  let installationFailed = false;
  let recipeWritten = false;
  try {
    try {
      if ((await lstat(cwd)).isSymbolicLink())
        throw new Error(`Destination must not be a symbolic link: ${cwd}`);
      if ((await readdir(cwd)).length)
        throw new Error(`Destination is not empty: ${cwd}`);
    } catch (error: unknown) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
      await mkdir(cwd, { recursive: true });
    }
    create({
      cwd,
      name: basename(cwd),
      template: request.template,
      types: request.types,
    });
    completed.push('scaffold');
    if (request.addons.includes('prettier')) {
      await add({
        addons: { prettier: officialAddons.prettier },
        cwd,
        options: { prettier: {} },
        packageManager: request.packageManager,
      });
    }
    if (request.addons.includes('license')) {
      const result = await runAdd({
        addon: 'license',
        cwd,
        author: request.author,
        year: request.year,
      });
      if (result.status !== 'applied' && result.status !== 'no-op')
        throw new Error(`License add-on failed: ${result.message}`);
    }
    completed.push('add-ons');
    let warning: string | undefined;
    if (request.install) {
      installation = 'started';
      try {
        warning = await installDependencies(request.packageManager, cwd);
        installation = 'completed';
      } catch (error) {
        installation = 'failed';
        installationFailed = true;
        throw error;
      }
      completed.push('installation');
    }
    await Promise.all([
      readFile(resolve(cwd, 'package.json'), 'utf8'),
      readFile(resolve(cwd, 'README.md'), 'utf8'),
    ]);
    completed.push('verification');
    await writeRecipe(cwd, renderRecipe(recreationRecipeArgv(request)));
    recipeWritten = true;
    completed.push('recipe');
    return { cwd, installed: request.install, warning };
  } catch (error: unknown) {
    if (error instanceof CreateFailure) throw error;
    let filesRemain = false;
    try {
      filesRemain = (await readdir(cwd)).length > 0;
    } catch {
      // The destination may not have been created yet.
    }
    const message = error instanceof Error ? error.message : String(error);
    const nextStep = installationFailed
      ? `Resolve the installation error, then run ${request.packageManager} install in ${cwd}. The Leftium recipe was not written.`
      : completed.length === 0 && filesRemain
        ? 'The destination was not modified. Choose a missing or empty destination and retry.'
        : filesRemain
          ? `Inspect the partial project at ${cwd}, resolve the error, and retry with a new empty destination.`
          : 'Resolve the reported error and retry the creation command.';
    throw new CreateFailure(
      {
        status: 'failed',
        destination: cwd,
        completed,
        filesRemain,
        installation,
        recipeWritten,
        message,
        nextStep,
      },
      error,
    );
  }
}

export async function runCreate(
  input: CreateRequest,
): Promise<{ cwd: string; installed: boolean; warning?: string }> {
  const destination = resolve(input.cwd);
  try {
    return await executeCreate(input);
  } catch (error: unknown) {
    if (error instanceof CreateFailure) throw error;
    let filesRemain = false;
    try {
      filesRemain = (await readdir(destination)).length > 0;
    } catch {
      // Preflight may fail before the destination exists.
    }
    throw new CreateFailure(
      {
        status: 'failed',
        destination,
        completed: [],
        filesRemain,
        installation: (input.install ?? true) ? 'not-started' : 'not-requested',
        recipeWritten: false,
        message: error instanceof Error ? error.message : String(error),
        nextStep: filesRemain
          ? 'The destination was not modified. Choose a missing or empty destination and retry.'
          : 'Resolve the reported input or environment error and retry the creation command.',
      },
      error,
    );
  }
}
