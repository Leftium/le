import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, stat, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { classify, reconcile, render, type state } from '../src/addons/license/License.gen.js';
import { runAdd, type AddRequest } from '../src/orchestration/add.js';
import { discover } from '../src/project/context.js';
import { applyEdits } from '../src/project/files.js';
import { resolvePresets, type PresetCatalog } from '../src/addons/gitattributes/index.js';

const cli = resolve('dist/src/cli/index.js');
const defaults = { addon: 'license', author: 'Ada Lovelace', year: '2026' };
async function fixture(t: TestContext, files: Record<string, string> = {}): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'leftium-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}
function add(cwd: string, options: Partial<AddRequest> = {}) { return runAdd({ ...defaults, cwd, ...options }); }
function git(cwd: string, ...args: string[]) { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }); }

test('pure classification distinguishes missing, equivalent, different, customized, and inconsistent', () => {
  const mit = render('Ada', '2026');
  const cases: [string[], state][] = [
    [[], 'Absent'], [[mit], 'Correct'], [[mit.replaceAll('\n', '\r\n')], 'Correct'],
    [[mit.replace('MIT License\n\n', '')], 'Correct'], [[`# ${mit}`], 'Correct'],
    [[render('Grace', '2026')], 'Different'], [['Apache License\nVersion 2.0'], 'Different'],
    [[mit + '\nAdditional restrictions'], 'Customized'], [['Custom terms'], 'Customized'],
    [[mit, 'Custom terms'], 'Inconsistent'], [[mit, mit], 'Correct'],
  ];
  for (const [files, expected] of cases) assert.equal(classify(files, mit), expected);
});

test('pure reconciliation requires choices and refuses inconsistent files even with force', () => {
  assert.deepEqual(reconcile('Absent', false, true, false), { TAG: 'Ready', writeLicense: true, writeMetadata: true });
  assert.deepEqual(reconcile('Correct', false, false, false), { TAG: 'Ready', writeLicense: false, writeMetadata: false });
  assert.equal(reconcile('Customized', false, false, false).TAG, 'RequireChoice');
  assert.equal(reconcile('Correct', true, false, false).TAG, 'RequireChoice');
  assert.equal(reconcile('Inconsistent', false, false, true).TAG, 'Conflict');
  assert.equal(reconcile('Customized', true, false, true).TAG, 'Ready');
  // This fixture is also a compile-time check of the generated boundary.
  // @ts-expect-error Invalid domain states must not silently cross from TypeScript.
  const invalid: state = 'Installed';
  void invalid;
});

test('plain directory needs no Git, manifest, or recipe; repeat does not rewrite', async t => {
  const root = await fixture(t);
  const first = await add(root, { install: false });
  assert.equal(first.status, 'applied');
  assert.equal(first.verification, 'passed');
  assert.deepEqual(await readdir(root), ['LICENSE']);
  assert.equal(await readFile(join(root, 'LICENSE'), 'utf8'), render(defaults.author, defaults.year));
  const before = await stat(join(root, 'LICENSE'));
  assert.equal((await add(root)).status, 'no-op');
  assert.equal((await stat(join(root, 'LICENSE'))).mtimeMs, before.mtimeMs);
});

test('recipe presence has no effect on decisions or managed output', async t => {
  const a = await fixture(t, { 'README.md': 'Recipe: leftium create ...\n', '.leftium/history': 'historical\n' });
  const b = await fixture(t);
  for (let i = 0; i < 2; i++) {
    const left = await add(a); const right = await add(b);
    assert.equal(left.status, right.status);
    assert.equal(left.verification, right.verification);
    assert.equal(await readFile(join(a, 'LICENSE'), 'utf8'), await readFile(join(b, 'LICENSE'), 'utf8'));
  }
  assert.equal(await readFile(join(a, 'README.md'), 'utf8'), 'Recipe: leftium create ...\n');
  assert.equal(await readFile(join(a, '.leftium/history'), 'utf8'), 'historical\n');
});

test('equivalent alternate file survives, including its original year and holder', async t => {
  const text = render('Historical Holder', '2018-2020').replaceAll('\n', '\r\n');
  const root = await fixture(t, { 'LICENSE.md': text });
  assert.equal((await runAdd({ addon: 'license', cwd: root })).status, 'no-op');
  assert.deepEqual(await readdir(root), ['LICENSE.md']);
  assert.equal(await readFile(join(root, 'LICENSE.md'), 'utf8'), text);
});

test('package author inference and targeted metadata edit preserve unrelated content', async t => {
  const text = '{\n\t"name": "fixture",\n\t"author": {"name":"Grace Hopper"},\n\t"scripts": {"test": "echo ok"}\n}\n';
  const root = await fixture(t, { 'package.json': text });
  const result = await add(root, { author: undefined });
  assert.equal(result.status, 'applied');
  assert.match(await readFile(join(root, 'LICENSE'), 'utf8'), /2026 Grace Hopper/);
  const updated = await readFile(join(root, 'package.json'), 'utf8');
  assert.ok(updated.includes('\t"scripts": {"test": "echo ok"},\n'));
  assert.match(updated, /\n\t"license": "MIT"\n}\n$/);
  assert.equal(JSON.parse(updated).license, 'MIT');
  assert.deepEqual(JSON.parse(updated), { ...JSON.parse(text), license: 'MIT' });
  assert.equal((await add(root, { author: undefined })).status, 'no-op');
});

test('explicit metadata wins over project author and Git config', async t => {
  const root = await fixture(t, { 'package.json': '{"author":"Project Author <a@example.test>","license":"MIT"}' });
  git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Git Author');
  assert.equal((await add(root)).status, 'applied');
  assert.equal(await readFile(join(root, 'LICENSE'), 'utf8'), render(defaults.author, defaults.year));
});

test('Git author is inferred without requiring package.json', async t => {
  const root = await fixture(t);
  git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Git Author');
  assert.equal((await add(root, { author: undefined })).status, 'applied');
  assert.match(await readFile(join(root, 'LICENSE'), 'utf8'), /2026 Git Author/);
});

test('metadata mismatch prevents license creation until explicit force', async t => {
  const text = '{"name":"fixture","license":"Apache-2.0","custom":{"keep":true}}\n';
  const root = await fixture(t, { 'package.json': text });
  assert.equal((await add(root)).status, 'conflict');
  assert.deepEqual(await readdir(root), ['package.json']);
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), text);
  assert.equal((await add(root, { force: true })).status, 'applied');
  assert.deepEqual(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')), { name: 'fixture', license: 'MIT', custom: { keep: true } });
});

test('forcing root license metadata preserves similarly named nested fields', async t => {
  const text = '{"nested":{"license":"keep"},"license":"BSD-3-Clause"}\n';
  const root = await fixture(t, { 'package.json': text });
  assert.equal((await add(root, { force: true })).status, 'applied');
  assert.deepEqual(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')), {
    nested: { license: 'keep' }, license: 'MIT',
  });
});

test('customized and recognizable different licenses require explicit replacement', async t => {
  for (const text of ['Custom terms\n', render('Other', '2020'), render('Other', '2020') + 'Extra conditions\n']) {
    const root = await fixture(t, { 'LICENSE.txt': text });
    assert.equal((await add(root)).status, 'conflict');
    assert.equal(await readFile(join(root, 'LICENSE.txt'), 'utf8'), text);
    assert.equal((await add(root, { force: true })).status, 'applied');
    assert.deepEqual(await readdir(root), ['LICENSE.txt']);
    assert.equal(await readFile(join(root, 'LICENSE.txt'), 'utf8'), render(defaults.author, defaults.year));
  }
});

test('inconsistent files remain a conflict even with force', async t => {
  const root = await fixture(t, { LICENSE: render('Ada', '2026'), 'LICENSE.md': 'Custom' });
  const result = await add(root, { force: true });
  assert.equal(result.status, 'conflict');
  assert.deepEqual(result.changed, []);
  assert.equal(await readFile(join(root, 'LICENSE.md'), 'utf8'), 'Custom');
});

test('equivalent multiple files remain unchanged', async t => {
  const text = render(defaults.author, defaults.year);
  const root = await fixture(t, { LICENSE: text, 'LICENSE.md': text });
  assert.equal((await add(root)).status, 'no-op');
});

test('interactive approval and cancellation use ordinary orchestration', async t => {
  const root = await fixture(t, { LICENSE: 'Custom', 'package.json': '{"license":"BSD-3-Clause"}' });
  const canceled = await runAdd({ ...defaults, cwd: root }, { text: async () => undefined, confirm: async () => undefined });
  assert.equal(canceled.status, 'canceled');
  assert.deepEqual(canceled.changed, []);
  let count = 0;
  const result = await runAdd({ ...defaults, cwd: root }, { text: async () => 'Ada', confirm: async message => { count++; assert.match(message, /package.json/); return true; } });
  assert.equal(result.status, 'applied');
  assert.equal(count, 1);
});

test('non-interactive missing author fails before writes', async t => {
  const root = await fixture(t);
  const result = spawnSync(process.execPath, [cli, 'add', 'license', '-C', root, '--non-interactive'], {
    encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--author/);
  assert.deepEqual(await readdir(root), []);
});

test('interactive author input and cancellation happen before mutation', async t => {
  const root = await fixture(t);
  git(root, 'init', '-q'); git(root, 'config', 'user.name', '');
  const request = { addon: 'license', cwd: root, year: '2026' };
  assert.equal((await runAdd(request, { text: async () => undefined, confirm: async () => true })).status, 'canceled');
  assert.deepEqual(await readdir(root), ['.git']);
  assert.equal((await runAdd(request, { text: async () => 'Prompt Holder', confirm: async () => true })).status, 'applied');
  assert.equal(await readFile(join(root, 'LICENSE'), 'utf8'), render('Prompt Holder', '2026'));
});

test('invalid inputs, presets, and add-ons fail before writes', async t => {
  const root = await fixture(t);
  for (const options of [{ author: '' }, { author: 'Ada\nBad' }, { year: '2026-2020' }, { year: 'abc' }, { preset: 'unknown' }, { addon: 'pages' }]) {
    const result = await add(root, options);
    assert.ok(['conflict', 'unsupported'].includes(result.status));
    assert.deepEqual(result.changed, []);
  }
  assert.deepEqual(await readdir(root), []);
});

test('gitattributes defaults to nodiff, composes ordered presets, and deduplicates requests', async t => {
  const root = await fixture(t);
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: root })).status, 'applied');
  const defaultText = await readFile(join(root, '.gitattributes'), 'utf8');
  assert.match(defaultText, /Selected presets: nodiff/);
  assert.match(defaultText, /package-lock\.json text eol=lf -diff/);

  const composed = await fixture(t);
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: composed, preset: ['nodiff', 'eol', 'nodiff'] })).status, 'applied');
  const text = await readFile(join(composed, '.gitattributes'), 'utf8');
  assert.match(text, /Selected presets: nodiff, eol/);
  assert.ok(text.indexOf('package-lock.json') < text.indexOf('* text=auto eol=lf'));
  assert.equal((text.match(/package-lock\.json/g) ?? []).length, 1);
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: composed, preset: ['nodiff', 'eol'] })).status, 'no-op');
});

test('CLI defaults gitattributes to nodiff when no --preset is supplied', async t => {
  const root = await fixture(t);
  const result = spawnSync(process.execPath, [cli, 'add', 'gitattributes', '-C', root, '--non-interactive'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(join(root, '.gitattributes'), 'utf8'), /package-lock\.json text eol=lf -diff/);
});

test('gitattributes resolver rejects unknown names and cycles before mutation', async t => {
  const root = await fixture(t);
  const unknown = await runAdd({ addon: 'gitattributes', cwd: root, preset: 'missing' });
  assert.equal(unknown.status, 'unsupported');
  assert.deepEqual(await readdir(root), []);
  const cyclic: PresetCatalog = { a: { presets: ['b'] }, b: { presets: ['a'] } };
  assert.throws(() => resolvePresets(['a'], cyclic), /cycle/);
});

test('gitattributes preserves user rules, regenerates its block, and appends native overrides', async t => {
  const root = await fixture(t, {
    '.gitattributes': '*.png binary\n',
    '.leftium/gitattributes.override': 'vendor.lock -diff\n# Keep this comment\n',
  });
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: root, preset: 'eol' })).status, 'applied');
  const path = join(root, '.gitattributes');
  const initial = await readFile(path, 'utf8');
  assert.match(initial, /^\*\.png binary\n\n# BEGIN LEFTIUM GITATTRIBUTES/m);
  assert.ok(initial.indexOf('* text=auto eol=lf') < initial.indexOf('vendor.lock -diff'));
  await writeFile(path, initial.replace('* text=auto eol=lf', 'edited managed content'));
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: root, preset: 'eol' })).status, 'applied');
  const regenerated = await readFile(path, 'utf8');
  assert.match(regenerated, /\* text=auto eol=lf/);
  assert.doesNotMatch(regenerated, /edited managed content/);
  assert.match(regenerated, /vendor\.lock -diff\n# Keep this comment/);
});

test('gitattributes preserves CRLF user content and override bytes', async t => {
  const root = await fixture(t, {
    '.gitattributes': '*.png binary\r\n',
    '.leftium/gitattributes.override': 'vendor.lock -diff\r\n',
  });
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: root, preset: 'eol' })).status, 'applied');
  const text = await readFile(join(root, '.gitattributes'), 'utf8');
  assert.match(text, /^\*\.png binary\r\n\r\n# BEGIN LEFTIUM GITATTRIBUTES/m);
  assert.match(text, /vendor\.lock -diff\r\n# END LEFTIUM GITATTRIBUTES/);
});

test('gitattributes refuses malformed markers and conflicting user rules before writing', async t => {
  for (const text of [
    '# BEGIN LEFTIUM GITATTRIBUTES\nuser rule\n',
    '# BEGIN LEFTIUM GITATTRIBUTES\n# END LEFTIUM GITATTRIBUTES\n# BEGIN LEFTIUM GITATTRIBUTES\n# END LEFTIUM GITATTRIBUTES\n',
    'package-lock.json diff\n',
  ]) {
    const root = await fixture(t, { '.gitattributes': text });
    const result = await runAdd({ addon: 'gitattributes', cwd: root, preset: 'nodiff' });
    assert.equal(result.status, 'conflict');
    assert.equal(await readFile(join(root, '.gitattributes'), 'utf8'), text);
  }
});

test('gitattributes uses the Git root when present and the selected plain directory otherwise', async t => {
  const repository = await fixture(t, { 'nested/project/keep': 'x' });
  git(repository, 'init', '-q');
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: join(repository, 'nested/project') })).status, 'applied');
  await stat(join(repository, '.gitattributes'));
  await assert.rejects(stat(join(repository, 'nested/project/.gitattributes')));

  const plain = await fixture(t, { 'nested/keep': 'x' });
  assert.equal((await runAdd({ addon: 'gitattributes', cwd: join(plain, 'nested'), preset: 'eol' })).status, 'applied');
  await stat(join(plain, 'nested/.gitattributes'));
  await assert.rejects(stat(join(plain, '.gitattributes')));
});

test('workspace ancestor license requires a package-level choice; force is insufficient', async t => {
  const root = await fixture(t, {
    'package.json': '{"private":true,"workspaces":["packages/*"]}',
    LICENSE: 'Root custom license',
    'packages/app/package.json': '{"name":"app"}',
    'package-lock.json': '{}',
  });
  const target = join(root, 'packages/app');
  const context = await discover(target);
  assert.equal((await discover(root)).workspaceRoot, root);
  assert.equal(context.workspaceRoot, root);
  assert.equal(context.packageRoot, target);
  assert.equal((await add(target, { force: true })).status, 'conflict');
  assert.equal((await add(target, { packageLicense: true })).status, 'applied');
  assert.equal(await readFile(join(root, 'LICENSE'), 'utf8'), 'Root custom license');
  assert.equal(await readFile(join(root, 'package-lock.json'), 'utf8'), '{}');
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), '{"private":true,"workspaces":["packages/*"]}');
});

test('generic workspace root invocation remains valid without selecting an arbitrary child', async t => {
  const root = await fixture(t, { 'package.json': '{"workspaces":["packages/*"]}', 'packages/a/package.json': '{}', 'packages/b/package.json': '{}' });
  assert.equal((await add(root)).status, 'applied');
  assert.deepEqual(await readdir(join(root, 'packages/a')), ['package.json']);
  assert.deepEqual(await readdir(join(root, 'packages/b')), ['package.json']);
});

test('pnpm membership comes from workspace configuration, not lockfiles', async t => {
  const root = await fixture(t, {
    'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n  - '!packages/excluded'\n",
    'pnpm-lock.yaml': 'lockfileVersion: 9',
    'packages/app/package.json': '{}', 'packages/excluded/package.json': '{}',
  });
  assert.equal((await discover(join(root, 'packages/app'))).workspaceRoot, root);
  assert.equal((await discover(join(root, 'packages/excluded'))).workspaceRoot, undefined);
  await rm(join(root, 'pnpm-workspace.yaml'));
  assert.equal((await discover(join(root, 'packages/app'))).workspaceRoot, undefined);
});

test('invalid ancestor workspace metadata does not block a generic directory target', async t => {
  const root = await fixture(t, { 'pnpm-workspace.yaml': 'packages: [', 'nested/keep': 'yes' });
  assert.equal((await add(join(root, 'nested'))).status, 'applied');
});

test('generic subdirectory target does not edit enclosing package metadata', async t => {
  const root = await fixture(t, { 'package.json': '{"license":"Apache-2.0"}', 'nested/keep': 'yes' });
  assert.equal((await add(join(root, 'nested'))).status, 'applied');
  assert.equal(await readFile(join(root, 'package.json'), 'utf8'), '{"license":"Apache-2.0"}');
  assert.ok((await readdir(join(root, 'nested'))).includes('LICENSE'));
});

test('staged and unstaged user changes survive; .git file worktrees are supported', async t => {
  const root = await fixture(t, { 'package.json': '{"name":"fixture"}', keep: 'original' });
  git(root, 'init', '-q'); git(root, 'config', 'user.email', 'test@example.test'); git(root, 'config', 'user.name', 'Test');
  git(root, 'add', '.'); git(root, 'commit', '-qm', 'fixture');
  await writeFile(join(root, 'keep'), 'staged'); git(root, 'add', 'keep');
  await writeFile(join(root, 'keep'), 'unstaged');
  const index = await readFile(join(root, '.git/index'));
  assert.equal((await add(root)).status, 'applied');
  assert.deepEqual(await readFile(join(root, '.git/index')), index);
  assert.equal(await readFile(join(root, 'keep'), 'utf8'), 'unstaged');
  const worktree = join(root, 'linked');
  git(root, 'worktree', 'add', '-q', '--detach', worktree);
  assert.equal((await discover(worktree)).gitRoot, worktree);
  assert.equal((await add(worktree)).status, 'applied');
});

test('malformed or duplicate target metadata fails before license writes', async t => {
  for (const text of ['{bad', '{"license":"MIT","license":"BSD"}', '[]']) {
    const root = await fixture(t, { 'package.json': text });
    assert.equal((await add(root)).status, 'failed');
    assert.deepEqual(await readdir(root), ['package.json']);
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), text);
  }
});

test('symlink license is rejected without modifying its destination', async t => {
  const root = await fixture(t, { outside: 'Keep this' });
  await symlink(join(root, 'outside'), join(root, 'LICENSE'));
  assert.equal((await add(root, { force: true })).status, 'failed');
  assert.equal(await readFile(join(root, 'outside'), 'utf8'), 'Keep this');
});

test('edits reject stale observations before writing any files', async t => {
  const root = await fixture(t, { first: 'old', second: 'changed' });
  const changed: string[] = [];
  await assert.rejects(applyEdits([
    { path: join(root, 'first'), before: 'old', after: 'new' },
    { path: join(root, 'second'), before: 'old', after: 'new' },
  ], changed), /changed during planning/);
  assert.deepEqual(changed, []);
  assert.equal(await readFile(join(root, 'first'), 'utf8'), 'old');
});

test('CLI translates explicit requests, reports paths, and exits nonzero on conflicts', async t => {
  const root = await fixture(t);
  const result = spawnSync(process.execPath, [cli, 'add', 'license', '-C', root, '--author', 'CLI Holder', '--year', '2025', '--non-interactive', '--no-install'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /applied:/);
  assert.ok(result.stdout.includes(join(root, 'LICENSE')));
  assert.equal(await readFile(join(root, 'LICENSE'), 'utf8'), render('CLI Holder', '2025'));
  const conflict = spawnSync(process.execPath, [cli, 'add', 'license', '-C', root, '--author', 'Other', '--non-interactive'], { encoding: 'utf8' });
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /--force/);
});

test('both executable aliases point at the same runnable entry', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.bin.le, pkg.bin.leftium);
  const result = spawnSync(process.execPath, [pkg.bin.le, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /leftium/);
});

test('CLI reports the package version through Commander options', async () => {
  const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
  for (const option of ['--version', '-V']) {
    const result = spawnSync(process.execPath, [cli, option], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${version}\n`);
  }
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.ok(help.stdout.includes(`leftium ${version}`));
  const versionCommand = spawnSync(process.execPath, [cli, 'version'], { encoding: 'utf8' });
  assert.notEqual(versionCommand.status, 0);
});

test('invoking the CLI without a command prints help and succeeds', () => {
  const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: leftium/);
  assert.match(result.stdout, /add \[options\] <addon>/);
});
