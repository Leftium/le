import { spawn } from 'node:child_process';
import { lstat, mkdir, readdir, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { applyEdits as jsonEdits, modify } from 'jsonc-parser';
import { parseDocument, stringify } from 'yaml';
import {
  gitValue,
  parseManifest,
  type ProjectContext,
} from '../../project/context.js';
import { readRegular, type Mutation } from '../../project/files.js';
import type { Interaction } from '../license/index.js';
import { Stopped } from '../../orchestration/stopped.js';
import { configureSvelte, configureVite, siteBase } from './config.js';

export const pagesWorkflowRef =
  'Leftium/le/.github/workflows/pages.yml@0637ad053ad33f8d997a20394dd1dc1afc33c985';
const workflowPrefix = 'Leftium/le/.github/workflows/pages.yml@';
export type PagesRequest = {
  cwd?: string;
  repository?: string;
  repositoryRoot?: string;
  siteUrl?: string;
  replaceAdapter?: boolean;
  packageManager?: string;
  packageManagerVersion?: string;
  nodeVersion?: string;
  workflowRef?: string;
  install?: boolean;
};
export type PagesOutcome = {
  localConfiguration: 'applied' | 'failed';
  staticBuild: 'passed' | 'failed' | 'skipped';
  remoteDeployment: 'skipped';
  followUp: string[];
};
export type PagesPlan = {
  edits: Mutation[];
  root: string;
  app: string;
  output: string;
  manager: 'npm' | 'pnpm';
  inputs: Record<string, string>;
  routeFiles: string[];
  base: string;
  followUp: string[];
};
function stop(status: 'conflict' | 'unsupported', message: string): never {
  throw new Stopped(status, message);
}
function contained(root: string, path: string): boolean {
  const rel = relative(root, path);
  return !rel.startsWith('../') && rel !== '..' && !rel.startsWith('/');
}
async function safePath(root: string, path: string): Promise<void> {
  if (!contained(root, path))
    stop('unsupported', `Path escapes the selected root: ${path}`);
  for (let current = path; current !== root; current = dirname(current)) {
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink())
        stop(
          'conflict',
          `Symlink paths require manual configuration: ${current}`,
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
async function files(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      stop(
        'unsupported',
        `Cannot inspect symlinked source/output: ${join(root, entry.name)}`,
      );
    if (entry.isDirectory())
      result.push(...(await files(join(root, entry.name))));
    else if (entry.isFile()) result.push(join(root, entry.name));
  }
  return result;
}
export async function inspectRoutes(app: string): Promise<string[]> {
  await safePath(app, join(app, 'src'));
  const sources = await files(join(app, 'src'));
  for (const path of sources) {
    if (!/\.(?:[cm]?[jt]s|svelte)$/.test(path)) continue;
    const text = (await readRegular(path)) ?? '';
    if (
      /(?:^|\/)hooks\.server\.[jt]s$/.test(path) ||
      /export\s+(?:const|let|var)\s+(?:actions\s*=|(?:prerender|ssr)\s*=\s*false)/.test(
        text,
      ) ||
      (/\b(?:cookies|locals|setHeaders|platform)\b/.test(text) &&
        /(?:\+.*server|server\.)/.test(path)) ||
      /\b(?:request|url)\.(?:headers|json|formData|text|searchParams)\b/.test(
        text,
      ) ||
      (/\+server\.[jt]s$/.test(path) &&
        /export\s+(?:(?:const|let|var)|(?:async\s+)?function)\s+(?:POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/.test(
          text,
        )) ||
      (/\.remote\.[jt]s$/.test(path) &&
        /\b(?:query|command|form)\s*\(/.test(text)) ||
      /\$env\/dynamic\/private/.test(text)
    )
      stop(
        'unsupported',
        `Request-time server behavior is unsupported: ${relative(app, path)}. Use fully prerendered routes without actions, request headers, cookies, or runtime secrets.`,
      );
  }
  return sources.filter(
    (path) =>
      contained(join(app, 'src/routes'), path) &&
      /\/\+page\.svelte$/.test(path),
  );
}
function exportOption(
  text: string,
  key: string,
  desired: string,
  path: string,
): string {
  const exported = new RegExp(`export\\s+(?:const|let|var)\\s+${key}\\s*=`);
  if (exported.test(text)) {
    const expected = desired === "'always'" ? `[\"']always[\"']` : desired;
    const value = new RegExp(
      `export\\s+const\\s+${key}\\s*=\\s*${expected}(?:\\s*[;\\n]|\\s*$)`,
    );
    if (!value.test(text))
      stop('conflict', `${path} has a conflicting ${key} export.`);
    return text;
  }
  if (new RegExp(`\\b${key}\\b`).test(text))
    stop(
      'conflict',
      `${path} has an ambiguous ${key} binding; configure it manually.`,
    );
  return `${text}${text && !text.endsWith('\n') ? '\n' : ''}export const ${key} = ${desired};\n`;
}
export function reconcileWorkflow(
  before: string | undefined,
  inputs: Record<string, string>,
  ref: string,
): string {
  if (
    !new RegExp(`^${workflowPrefix.replaceAll('.', '\\.')}[a-f0-9]{40}$`).test(
      ref,
    )
  )
    stop(
      'unsupported',
      'Use an immutable Leftium/le Pages workflow commit SHA with --workflow-ref.',
    );
  if (before === undefined)
    return (
      `# Thin caller: ownership, updates and troubleshooting:\n# https://github.com/Leftium/le/blob/${ref.split('@')[1]}/docs/pages.md\n` +
      stringify({
        name: 'Deploy GitHub Pages',
        on: { push: { branches: ['main'] }, workflow_dispatch: null },
        permissions: { contents: 'read', pages: 'write', 'id-token': 'write' },
        concurrency: { group: 'pages', 'cancel-in-progress': true },
        jobs: { pages: { uses: ref, with: inputs } },
      })
    );
  const document = parseDocument(before);
  if (document.errors.length)
    stop(
      'conflict',
      'Existing Pages workflow is invalid or has duplicate YAML keys.',
    );
  const data = document.toJS();
  if (
    !data ||
    typeof data !== 'object' ||
    !data.jobs ||
    typeof data.jobs !== 'object'
  )
    stop(
      'conflict',
      'Existing Pages workflow is not a supported reusable caller.',
    );
  const callers = Object.entries(data.jobs).filter(
    ([, value]) =>
      value &&
      typeof value === 'object' &&
      String((value as Record<string, unknown>).uses).startsWith(
        workflowPrefix,
      ),
  );
  if (callers.length !== 1)
    stop(
      'conflict',
      'Existing Pages workflow must call exactly one Leftium Pages workflow.',
    );
  const [job, value] = callers[0]!;
  const caller = value as Record<string, unknown>;
  for (const key of Object.keys(caller))
    if (
      ![
        'name',
        'uses',
        'with',
        'needs',
        'if',
        'secrets',
        'strategy',
        'concurrency',
        'permissions',
      ].includes(key)
    )
      stop('conflict', `Unsupported reusable caller field: ${key}.`);
  if (caller.permissions) {
    const granted = caller.permissions as Record<string, unknown>;
    if (
      granted.contents !== 'read' ||
      granted.pages !== 'write' ||
      granted['id-token'] !== 'write'
    )
      stop(
        'conflict',
        'Job permissions must grant the Pages deployment permissions.',
      );
  }
  if (
    !new RegExp(`^${workflowPrefix.replaceAll('.', '\\.')}[a-f0-9]{40}$`).test(
      String(caller.uses),
    )
  )
    stop('conflict', 'Existing caller must pin an immutable workflow SHA.');
  if (!caller.with || typeof caller.with !== 'object')
    stop('conflict', 'Existing caller requires explicit workflow inputs.');
  const current = caller.with as Record<string, unknown>;
  for (const [key, value] of Object.entries(current)) {
    if (!(key in inputs) || typeof value !== 'string')
      stop('conflict', `Unsupported caller input: ${key}.`);
    // Commands are caller-owned. Configuration and output must agree with the app.
    if (
      !['build-script', 'check-script', 'test-script'].includes(key) &&
      value !== inputs[key]
    )
      stop(
        'conflict',
        `Caller ${key} conflicts with the selected project; reconcile it explicitly.`,
      );
  }
  const permissions = data.permissions;
  if (
    !permissions ||
    permissions.contents !== 'read' ||
    permissions.pages !== 'write' ||
    permissions['id-token'] !== 'write'
  )
    stop(
      'conflict',
      'Caller requires contents: read, pages: write, and id-token: write permissions.',
    );
  document.setIn(['jobs', job, 'uses'], ref);
  for (const [key, value] of Object.entries(inputs))
    if (!(key in current)) document.setIn(['jobs', job, 'with', key], value);
  return document.toString();
}

export async function planPages(
  context: ProjectContext,
  request: PagesRequest,
  interaction?: Interaction,
): Promise<PagesPlan> {
  const app = context.packageRoot;
  if (!app) stop('unsupported', 'Select a SvelteKit package with --cwd.');
  if (context.workspaceRoot)
    stop(
      'unsupported',
      'Workspace Pages deployment is not yet verified. Use a standalone SvelteKit package.',
    );
  const manifestPath = join(app, 'package.json');
  const beforeManifest = await readRegular(manifestPath);
  const manifest = parseManifest(beforeManifest!, manifestPath).data;
  const dependencies = {
    ...(manifest.dependencies as object),
    ...(manifest.devDependencies as object),
  } as Record<string, unknown>;
  if (typeof dependencies['@sveltejs/kit'] !== 'string')
    stop(
      'unsupported',
      'Pages supports fully prerendered SvelteKit packages only.',
    );
  const root = request.repositoryRoot
    ? await realpath(resolve(context.target, request.repositoryRoot))
    : context.gitRoot;
  if (!root)
    stop(
      'unsupported',
      'Without Git, supply --repository-root and --repository owner/repository.',
    );
  if (!contained(root, app) || root !== app)
    stop(
      'unsupported',
      'Only a standalone app at the repository root is supported; app-directory/shared-install deployment is not yet verified.',
    );
  const origin = await gitValue(root, ['remote', 'get-url', 'origin']);
  const inferred = origin?.match(
    /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/,
  )?.[1];
  const repository = request.repository ?? inferred;
  if (!repository)
    stop(
      'unsupported',
      'Cannot detect the GitHub target. Supply --repository owner/repository.',
    );
  const site = siteBase(repository, request.siteUrl);
  for (const file of ['static/CNAME', 'CNAME']) {
    const cname = await readRegular(join(app, file));
    if (cname !== undefined && cname.trim().toLowerCase() !== site.domain)
      stop(
        'conflict',
        `Existing ${file} conflicts with the selected domain. Supply its root --site-url or reconcile the file manually.`,
      );
  }
  const configs = [];
  for (const name of [
    'svelte.config.js',
    'svelte.config.mjs',
    'svelte.config.ts',
  ])
    if ((await readRegular(join(app, name))) !== undefined) configs.push(name);
  if (configs.length > 1 || configs[0] === 'svelte.config.ts')
    stop(
      'unsupported',
      'Select one JavaScript Svelte config; ambiguous or TypeScript configs require manual setup.',
    );
  const viteConfigs: string[] = [];
  for (const name of [
    'vite.config.js',
    'vite.config.ts',
    'vite.config.mjs',
    'vite.config.mts',
  ])
    if ((await readRegular(join(app, name))) !== undefined)
      viteConfigs.push(name);
  if (viteConfigs.length > 1)
    stop('conflict', 'Multiple Vite configs require manual reconciliation.');
  const vitePath = viteConfigs[0] ? join(app, viteConfigs[0]) : undefined;
  const viteBefore = vitePath ? await readRegular(vitePath) : undefined;
  const inline =
    viteBefore === undefined
      ? undefined
      : configureVite(viteBefore, site.base, true);
  if (inline && configs.length)
    stop(
      'conflict',
      'Both inline Vite and legacy Svelte configs exist; select one source of SvelteKit configuration.',
    );
  const configPath = inline
    ? vitePath!
    : join(app, configs[0] ?? 'svelte.config.js');
  const configBefore = await readRegular(configPath);
  const configure = inline ? configureVite : configureSvelte;
  let configured = configure(
    configBefore ?? 'export default {};\n',
    site.base,
    Boolean(request.replaceAdapter),
  )!;
  if (configured.needsReplacement && !request.replaceAdapter) {
    const answer = await interaction?.confirm(
      'Replace @sveltejs/adapter-auto with @sveltejs/adapter-static?',
    );
    if (answer === undefined && interaction)
      throw new Stopped('canceled', 'Canceled before writing.');
    if (!answer)
      stop(
        'conflict',
        'Replacing adapter-auto requires --replace-adapter or interactive confirmation.',
      );
    configured = configure(configBefore!, site.base, true)!;
  }
  // Custom source/output contracts need their own verified workflow boundary.
  if (/\b(?:files|outDir)\s*:/.test(configured.text))
    stop(
      'unsupported',
      'Custom kit.files/outDir configuration requires manual Pages setup.',
    );
  const routeFiles = await inspectRoutes(app);
  if (!routeFiles.length)
    stop('unsupported', 'No src/routes/+page.svelte routes were found.');
  const scripts = manifest.scripts as Record<string, unknown> | undefined;
  if (typeof scripts?.build !== 'string')
    stop('unsupported', 'A package build script is required.');
  const lockfiles = [];
  for (const name of [
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
  ])
    if ((await readRegular(join(root, name))) !== undefined)
      lockfiles.push(name);
  if (lockfiles.length > 1)
    stop(
      'conflict',
      'Conflicting package-manager lockfiles; reconcile before applying Pages.',
    );
  const declared =
    typeof manifest.packageManager === 'string'
      ? manifest.packageManager
      : undefined;
  const manager =
    request.packageManager ??
    declared?.split('@')[0] ??
    (lockfiles[0] === 'package-lock.json'
      ? 'npm'
      : lockfiles[0] === 'pnpm-lock.yaml'
        ? 'pnpm'
        : undefined);
  if (manager !== 'npm' && manager !== 'pnpm')
    stop(
      'unsupported',
      'Supply --package-manager npm or pnpm (or declare packageManager).',
    );
  if (
    (declared && declared.split('@')[0] !== manager) ||
    lockfiles.some(
      (name) =>
        name !== (manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'),
    )
  )
    stop(
      'conflict',
      'Package-manager selection conflicts with project metadata or lockfile.',
    );
  const managerVersion =
    request.packageManagerVersion ??
    declared?.split('@')[1]?.split('+')[0] ??
    '';
  if (
    (manager === 'pnpm' && !managerVersion) ||
    (managerVersion && !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(managerVersion))
  )
    stop(
      'unsupported',
      'Declare an exact packageManager version or supply --package-manager-version.',
    );
  if (
    request.packageManagerVersion &&
    declared &&
    declared.split('@')[1]?.split('+')[0] !== request.packageManagerVersion
  )
    stop(
      'conflict',
      'The requested package-manager version conflicts with packageManager. Reconcile project metadata first.',
    );
  const engines = manifest.engines as Record<string, unknown> | undefined;
  const nodeVersion = request.nodeVersion ?? engines?.node;
  if (
    typeof nodeVersion !== 'string' ||
    !/^[\d\s.xX*^~<>=|v-]+$/.test(nodeVersion)
  )
    stop(
      'unsupported',
      'Declare engines.node or supply --node-version for the deployment workflow.',
    );
  const inputs: Record<string, string> = {
    'app-directory': '.',
    'package-manager': manager,
    'package-manager-version': managerVersion,
    'node-version': nodeVersion,
    'build-script': 'build',
    'check-script': typeof scripts?.check === 'string' ? 'check' : '',
    'test-script': typeof scripts?.test === 'string' ? 'test' : '',
    'publish-directory': configured.output,
  };
  const edits: Mutation[] = [];
  const add = async (path: string, after: string) => {
    await safePath(root, path);
    const before = await readRegular(path);
    if (before !== after) edits.push({ path, before, after });
  };
  await add(configPath, configured.text);
  let packageText = beforeManifest!;
  if (typeof dependencies['@sveltejs/adapter-static'] !== 'string')
    packageText = jsonEdits(
      packageText,
      modify(
        packageText,
        ['devDependencies', '@sveltejs/adapter-static'],
        '^3.0.0',
        { formattingOptions: { insertSpaces: true, tabSize: 2 } },
      ),
    );
  for (const section of ['dependencies', 'devDependencies'])
    if (
      (manifest[section] as Record<string, unknown> | undefined)?.[
        '@sveltejs/adapter-auto'
      ]
    )
      packageText = jsonEdits(
        packageText,
        modify(packageText, [section, '@sveltejs/adapter-auto'], undefined, {}),
      );
  await add(manifestPath, packageText);
  const layouts = [];
  for (const extension of ['ts', 'js'])
    if (
      (await readRegular(join(app, `src/routes/+layout.${extension}`))) !==
      undefined
    )
      layouts.push(extension);
  if (layouts.length > 1)
    stop(
      'conflict',
      'Multiple root layout modules require manual reconciliation.',
    );
  const layoutPath = join(app, `src/routes/+layout.${layouts[0] ?? 'js'}`);
  let layout = (await readRegular(layoutPath)) ?? '';
  layout = exportOption(layout, 'prerender', 'true', layoutPath);
  layout = exportOption(layout, 'trailingSlash', "'always'", layoutPath);
  await add(layoutPath, layout);
  const workflowPath = join(root, '.github/workflows/pages.yml');
  await safePath(root, workflowPath);
  for (const path of await files(join(root, '.github/workflows'))) {
    if (path === workflowPath || !/\.ya?ml$/.test(path)) continue;
    const text = (await readRegular(path)) ?? '';
    if (
      /actions\/(?:deploy-pages|upload-pages-artifact)@|Leftium\/le\/\.github\/workflows\/pages\.yml@/i.test(
        text,
      )
    )
      stop(
        'conflict',
        `Another Pages deployment workflow exists: ${path}. Reconcile it first.`,
      );
  }
  const workflowBefore = await readRegular(workflowPath);
  const workflow = reconcileWorkflow(
    workflowBefore,
    inputs,
    request.workflowRef ?? pagesWorkflowRef,
  );
  const workflowData = parseDocument(workflow).toJS();
  const caller = Object.values(workflowData.jobs).find(
    (value) =>
      value &&
      typeof value === 'object' &&
      String((value as Record<string, unknown>).uses).startsWith(
        workflowPrefix,
      ),
  ) as { with: Record<string, string> };
  Object.assign(inputs, caller.with);
  for (const key of ['build-script', 'check-script', 'test-script'])
    if (inputs[key] && typeof scripts?.[inputs[key]!] !== 'string')
      stop('conflict', `Caller ${key} names a missing package script.`);
  await add(workflowPath, workflow);
  const followUp = [
    `Enable GitHub Pages with source GitHub Actions in https://github.com/${repository}/settings/pages.`,
    `Canonical site: ${request.siteUrl ?? `https://${repository.split('/')[0]!.toLowerCase()}.github.io${site.base}/`}. Review URL references and retire the old host explicitly.`,
    'Push the consumer files and lockfile, run its Pages workflow, then verify deployed routes and assets. Remote deployment was not checked.',
  ];
  if (site.domain)
    followUp.push(
      `Set ${site.domain} in repository Pages settings and configure DNS manually. Actions deployments ignore CNAME; any existing file is preserved. Aliases require HTTP redirects.`,
    );
  return {
    edits,
    root,
    app,
    output: configured.output,
    manager,
    inputs,
    routeFiles,
    base: site.base,
    followUp,
  };
}

export async function preparePagesDirectories(plan: PagesPlan): Promise<void> {
  for (const edit of plan.edits) {
    await safePath(plan.root, edit.path);
    await mkdir(dirname(edit.path), { recursive: true });
  }
}
async function execute(
  manager: string,
  args: string[],
  app: string,
): Promise<void> {
  process.stdout.write(`Pages: ${manager} ${args.join(' ')} in ${app}\n`);
  await new Promise<void>((accept, reject) => {
    const child = spawn(manager, args, { cwd: app, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) =>
      code === 0 && !signal
        ? accept()
        : reject(
            new Error(
              `${manager} ${args.join(' ')} failed (${signal ?? code}).`,
            ),
          ),
    );
  });
}
export async function verifyStaticOutput(plan: PagesPlan): Promise<void> {
  const output = join(plan.app, plan.output);
  await safePath(plan.app, output);
  const built = await files(output);
  if (!built.some((path) => path.endsWith('.html')))
    throw new Error('Static build has no HTML output.');
  for (const route of plan.routeFiles) {
    const directory = relative(join(plan.app, 'src/routes'), dirname(route))
      .split('/')
      .filter((segment) => !/^\(.*\)$/.test(segment))
      .join('/');
    if (directory.includes('[')) continue; // Dynamic entries are validated by strict adapter prerendering.
    if (
      (await readRegular(join(output, directory, 'index.html'))) === undefined
    )
      throw new Error(`Missing static route: /${directory}`);
  }
  for (const path of built.filter((path) => path.endsWith('.html'))) {
    const html = (await readRegular(path)) ?? '';
    for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)) {
      const url = match[1]!;
      if (/^(?:[a-z]+:|\/\/)/i.test(url)) continue;
      if (!/\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)(?:[?#]|$)/.test(url))
        continue;
      const clean = url.split(/[?#]/)[0]!;
      let asset: string;
      if (clean.startsWith('/')) {
        if (plan.base && !clean.startsWith(`${plan.base}/`))
          throw new Error(`Asset escapes canonical base path: ${url}`);
        asset = join(output, clean.slice(plan.base.length));
      } else asset = resolve(dirname(path), clean);
      if (!contained(output, asset) || !built.includes(asset))
        throw new Error(`Missing static asset: ${url}`);
    }
  }
}
export async function installAndVerifyPages(
  plan: PagesPlan,
  building: () => void,
): Promise<void> {
  await execute(plan.manager, ['install'], plan.app);
  for (const key of ['check-script', 'test-script', 'build-script'])
    if (plan.inputs[key]) {
      if (key === 'build-script') building();
      await execute(plan.manager, ['run', plan.inputs[key]!], plan.app);
    }
  await verifyStaticOutput(plan);
}
