import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { type TestContext } from 'node:test';
import { create } from 'sv';
import { runAdd } from '../src/orchestration/add.js';

const cli = resolve('dist/src/cli/index.js');
async function fixture(t: TestContext): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'leftium-delegation-')),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function svelte(cwd: string) {
  await mkdir(cwd, { recursive: true });
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ name: 'fixture', devDependencies: { svelte: '^5.0.0' } }),
  );
}
function invoke(entry: string, cwd: string, args: string[], input?: string) {
  return spawnSync(process.execPath, [entry, 'add', ...args], {
    cwd,
    encoding: 'utf8',
    input,
    timeout: 20000,
  });
}
function upstream(stdout: string): { argv: string[]; cwd: string } {
  const record = stdout
    .split('\n')
    .find((line) => line.startsWith('UPSTREAM:'));
  assert.ok(record, stdout);
  return JSON.parse(record.slice(9));
}

// A packed-layout fixture verifies resolution and real process behavior without
// exposing a test-only executable override in the shipped CLI.
async function stubCli(
  t: TestContext,
  body = '',
  pinned = false,
): Promise<string> {
  const root = await fixture(t);
  await cp(resolve('dist/src'), join(root, 'dist/src'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    '{"type":"module","version":"0.0.0"}',
  );
  const metadata = JSON.parse(await readFile('package.json', 'utf8'));
  for (const dependency of Object.keys(metadata.dependencies)) {
    if (dependency === 'sv') continue;
    const path = join(root, 'node_modules', dependency);
    await mkdir(dirname(path), { recursive: true });
    await symlink(
      await realpath(join('node_modules', dependency)),
      path,
      'dir',
    );
  }
  const sv = join(root, 'node_modules/sv');
  if (pinned) {
    const installed = resolve(
      dirname(fileURLToPath(import.meta.resolve('sv'))),
      '../..',
    );
    const providerModules = join(root, 'provider/node_modules');
    const copy = join(providerModules, 'sv');
    await cp(installed, copy, { recursive: true });
    for (const dependency of await readdir(dirname(installed))) {
      if (dependency === 'sv' || dependency === 'node_modules') continue;
      await symlink(
        join(dirname(installed), dependency),
        join(providerModules, dependency),
        'dir',
      );
    }
    await symlink(copy, sv, 'dir');
    return join(root, 'dist/src/cli/index.js');
  }
  await mkdir(join(sv, 'unusual'), { recursive: true });
  await writeFile(
    join(sv, 'package.json'),
    JSON.stringify({
      name: 'sv',
      type: 'module',
      exports: './index.js',
      bin: { sv: './unusual/cli.js' },
    }),
  );
  await writeFile(
    join(sv, 'index.js'),
    'export const create = () => {}; export const add = () => {}; export const officialAddons = {};',
  );
  await writeFile(
    join(sv, 'unusual/cli.js'),
    `console.log('UPSTREAM:' + JSON.stringify({argv: process.argv.slice(2), cwd: process.cwd()}));\n${body}`,
  );
  return join(root, 'dist/src/cli/index.js');
}

test('forwards upstream arguments verbatim, including Leftium flag collisions and multiple add-ons', async (t) => {
  const entry = await stubCli(t);
  const cwd = await fixture(t);
  await svelte(cwd);
  const args = [
    '@scope/sv@next=who:hello world',
    '--preset',
    'custom',
    '--author=Ada',
    '--force',
    '--no-install',
    '--no-download-check',
    '--custom',
    'value with spaces',
    'eslint',
    '--',
    '--cwd',
    'literal',
  ];
  const result = invoke(entry, cwd, args);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(upstream(result.stdout), {
    argv: ['add', '--cwd', cwd, ...args],
    cwd,
  });
  assert.match(result.stdout, /Delegating to sv add/);
  assert.doesNotMatch(result.stdout, /applied and verified/);
});

test('resolves nested and workspace package targets and consumes all supported cwd forms', async (t) => {
  const entry = await stubCli(t);
  const root = await fixture(t);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ workspaces: ['packages/*'] }),
  );
  const app = join(root, 'packages/app');
  await svelte(app);
  const nested = join(app, 'src');
  await mkdir(nested);
  for (const flags of [
    ['-C', nested],
    ['--cwd', nested],
    [`--cwd=${nested}`],
    [`-C${nested}`],
  ]) {
    const result = invoke(entry, root, [
      ...flags,
      'sv:prettier',
      '--no-install',
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(upstream(result.stdout), {
      argv: ['add', '--cwd', app, 'prettier', '--no-install'],
      cwd: nested,
    });
  }
});

test('built-ins win collisions, stay strict, and sv: bypasses them', async (t) => {
  const entry = await stubCli(t);
  const cwd = await fixture(t);
  await svelte(cwd);
  for (const addon of ['license', 'gitattributes']) {
    const result = invoke(entry, cwd, [
      '--author',
      'Test Author',
      addon,
      '--preset',
      addon === 'license' ? 'mit' : 'eol',
      '--no-install',
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /UPSTREAM:/);
    const qualified = invoke(entry, cwd, [`sv:${addon}`, '--no-install']);
    assert.equal(qualified.status, 0, qualified.stderr);
    assert.deepEqual(upstream(qualified.stdout).argv, [
      'add',
      '--cwd',
      cwd,
      addon,
      '--no-install',
    ]);
  }
  const rejected = invoke(entry, cwd, ['license', '--upstream-only']);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /unknown option/);
});

test('preserves nonzero upstream exit codes, failure details, and inherited input', async (t) => {
  const entry = await stubCli(
    t,
    "import { readFileSync } from 'node:fs'; console.log('INPUT:' + readFileSync(0, 'utf8')); console.error('upstream failure detail'); process.exitCode = 23;",
  );
  const cwd = await fixture(t);
  await svelte(cwd);
  const result = invoke(entry, cwd, ['prettier'], 'prompt answer\n');
  assert.equal(result.status, 23);
  assert.match(result.stdout, /INPUT:prompt answer/);
  assert.match(result.stderr, /upstream failure detail/);
  assert.match(result.stderr, /sv exited with status 23/);
});

test('preserves upstream signal termination', async (t) => {
  const entry = await stubCli(t, "process.kill(process.pid, 'SIGTERM');");
  const cwd = await fixture(t);
  await svelte(cwd);
  const result = invoke(entry, cwd, ['prettier']);
  assert.equal(result.signal, 'SIGTERM');
});

test('rejects non-Svelte targets, ambiguous workspace roots and empty qualifiers before spawning', async (t) => {
  const entry = await stubCli(t);
  const cwd = await fixture(t);
  for (const manifest of [
    undefined,
    { dependencies: { react: '^19' } },
    { workspaces: ['packages/*'] },
  ]) {
    if (manifest)
      await writeFile(join(cwd, 'package.json'), JSON.stringify(manifest));
    const result = invoke(entry, cwd, ['prettier']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires a Svelte/);
    assert.doesNotMatch(result.stdout, /UPSTREAM:/);
  }
  await svelte(cwd);
  for (const args of [
    ['sv:'],
    ['sv:prettier', '--non-interactive'],
    ['prettier', '--cwd'],
  ]) {
    const result = invoke(entry, cwd, args);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /UPSTREAM:/);
  }
});

test('the pinned sv CLI applies official add-ons in SvelteKit and Svelte without Kit', async (t) => {
  for (const template of ['minimal', 'svelte'] as const) {
    const cwd = await fixture(t);
    create({ cwd, name: 'fixture', template, types: 'typescript' });
    const result = invoke(cli, cwd, [
      'sv:prettier',
      '--no-install',
      '--no-git-check',
    ]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(
      await readFile(join(cwd, 'package.json'), 'utf8'),
      /"prettier"/,
    );
    assert.match(
      await readFile(join(cwd, 'prettier.config.js'), 'utf8'),
      /prettier-plugin-svelte/,
    );
  }
});

test('the pinned sv CLI resolves a local community add-on and inline options', async (t) => {
  // sv caches local packages beside its own installation. Keep that cache in
  // the disposable fixture rather than modifying the repository's dependency.
  const entry = await stubCli(t, '', true);
  const root = await fixture(t);
  const cwd = join(root, 'app');
  create({ cwd, name: 'fixture', template: 'minimal', types: 'typescript' });
  const addon = join(root, 'addon');
  await mkdir(addon);
  await writeFile(
    join(addon, 'package.json'),
    JSON.stringify({
      name: '@fixture/sv',
      type: 'module',
      exports: './index.js',
      peerDependencies: { sv: '^0.17.0' },
    }),
  );
  await writeFile(
    join(addon, 'index.js'),
    `export default { id: 'fixture', options: { who: { type: 'string', question: 'Who?', default: 'world' } }, run: ({sv, options}) => sv.file('community.txt', () => options.who) };`,
  );
  const result = invoke(entry, cwd, [
    'file:../addon=who:hello',
    '--no-install',
    '--no-git-check',
    '--no-download-check',
  ]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(await readFile(join(cwd, 'community.txt'), 'utf8'), 'hello\n');
});

test('ordinary orchestration requests use the real CLI and return its result', async (t) => {
  const cwd = await fixture(t);
  create({ cwd, name: 'fixture', template: 'minimal', types: 'typescript' });
  const result = await runAdd({
    cwd,
    addon: 'prettier',
    upstreamArgs: ['--no-install', '--no-git-check'],
  });
  assert.equal(result.status, 'applied');
  assert.deepEqual(result.delegated, { exitCode: 0 });
  assert.equal(result.verification, 'skipped');
});

test('orchestration rejects upstream target overrides before delegation', async (t) => {
  const cwd = await fixture(t);
  await svelte(cwd);
  const result = await runAdd({
    cwd,
    addon: 'prettier',
    upstreamArgs: ['--cwd', '/unsupported-target'],
  });
  assert.equal(result.status, 'unsupported');
  assert.equal(result.delegated, undefined);
  assert.match(result.message, /request.cwd/);
  assert.deepEqual(result.changed, []);
});

test('a separator before the delegated name keeps following options literal', async (t) => {
  const entry = await stubCli(t);
  const cwd = await fixture(t);
  await svelte(cwd);
  const result = invoke(entry, cwd, ['--', 'sv:prettier', '--cwd', 'literal']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(upstream(result.stdout).argv, [
    'add',
    '--cwd',
    cwd,
    'prettier',
    '--',
    '--cwd',
    'literal',
  ]);
});

test('the pinned provider applies only to the selected workspace member', async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ private: true, workspaces: ['packages/*'] }),
  );
  const app = join(root, 'packages/app');
  await mkdir(app, { recursive: true });
  create({
    cwd: app,
    name: 'fixture',
    template: 'minimal',
    types: 'typescript',
  });
  const original = await readFile(join(root, 'package.json'), 'utf8');
  const result = invoke(cli, root, [
    'prettier',
    '--cwd',
    app,
    '--no-install',
    '--no-git-check',
  ]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(await readFile(join(app, 'package.json'), 'utf8'), /"prettier"/);
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), original);
});
