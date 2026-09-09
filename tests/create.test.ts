import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { recreationRecipeArgv, renderRecipe, runCreate } from '../src/orchestration/create.js';
import { version } from '../src/version.js';

const execFileAsync = promisify(execFile);

async function destination(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'leftium-create-'));
  return join(root, name);
}

test('creates a minimal Svelte project without installing dependencies', async () => {
  const cwd = await destination('minimal-app');
  const result = await runCreate({ cwd, install: false });
  assert.equal(result.installed, false);
  assert.match(await readFile(join(cwd, 'package.json'), 'utf8'), /"name": "minimal-app"/);
  const readme = await readFile(join(cwd, 'README.md'), 'utf8');
  assert.match(readme, /## Leftium recreation/);
  assert.match(readme, new RegExp(`leftium@${version.replaceAll('.', '\\.')} create`));
  assert.doesNotMatch(readme, /npx sv create my-app/);
});

test('rejects a nonempty destination before Svelte scaffolding', async () => {
  const cwd = await destination('occupied');
  await mkdir(cwd);
  await writeFile(join(cwd, 'keep.txt'), 'keep');
  await assert.rejects(() => runCreate({ cwd, install: false }), /Destination is not empty/);
  assert.equal(await readFile(join(cwd, 'keep.txt'), 'utf8'), 'keep');
});

test('validates inputs and rejects symbolic destinations before scaffolding', async () => {
  const invalid = await destination('invalid-types');
  await assert.rejects(() => runCreate({ cwd: invalid, types: 'invalid' as never, install: false }), /Unsupported --types/);
  await assert.rejects(() => readFile(join(invalid, 'package.json')), /ENOENT/);

  const invalidLicense = await destination('invalid-license');
  await assert.rejects(() => runCreate({ cwd: invalidLicense, addons: ['license'], author: '\n', install: false }), /Supply a nonempty/);
  await assert.rejects(() => readFile(join(invalidLicense, 'package.json')), /ENOENT/);

  const root = await mkdtemp(join(tmpdir(), 'leftium-create-'));
  const target = join(root, 'target');
  const link = join(root, 'link');
  await mkdir(target);
  await symlink(target, link);
  await assert.rejects(() => runCreate({ cwd: link, install: false }), /symbolic link/);
  await assert.rejects(() => readFile(join(target, 'package.json')), /ENOENT/);
});

test('composes the official Prettier add-on and the Leftium license add-on', async () => {
  const cwd = await destination('composed-app');
  await runCreate({ cwd, addons: ['prettier', 'license'], author: 'Test Author', year: '2026', install: false });
  const manifest = await readFile(join(cwd, 'package.json'), 'utf8');
  assert.match(manifest, /"prettier"/);
  assert.match(await readFile(join(cwd, 'LICENSE'), 'utf8'), /Copyright \(c\) 2026 Test Author/);
  assert.match(await readFile(join(cwd, 'README.md'), 'utf8'), /--add prettier --add license/);
});

test('replays the recorded recipe through the packed local CLI', async () => {
  const first = await destination('replay-app');
  await runCreate({ cwd: first, addons: ['prettier', 'license'], author: "Ada Lovelace's Workshop", year: '1843', install: false });
  const command = /<!-- leftium:creation-recipe -->\n```sh\n([^\n]+)/.exec(await readFile(join(first, 'README.md'), 'utf8'))?.[1];
  assert.ok(command);
  const expectedArgv = recreationRecipeArgv({ cwd: first, template: 'minimal', types: 'typescript', addons: ['prettier', 'license'], author: "Ada Lovelace's Workshop", year: '1843', packageManager: 'pnpm', install: false });
  assert.equal(renderRecipe(expectedArgv), command);
  assert.deepEqual(await shellArgv(command), expectedArgv);
  assert.match(command, /Ada Lovelace/);

  const artifactDirectory = await mkdtemp(join(tmpdir(), 'leftium-pack-'));
  await execFileAsync('pnpm', ['pack', '--ignore-scripts', '--pack-destination', artifactDirectory], { cwd: process.cwd() });
  const artifact = join(artifactDirectory, (await readdir(artifactDirectory)).find(file => file.endsWith('.tgz'))!);
  const replayArgv = await shellArgv(command);
  replayArgv[2] = artifact;
  const secondParent = await mkdtemp(join(tmpdir(), 'leftium-replay-'));
  await execFileAsync(replayArgv[0]!, replayArgv.slice(1), { cwd: secondParent });
  const second = join(secondParent, 'replay-app');

  for (const project of [first, second]) {
    assert.match(await readFile(join(project, 'src/routes/+page.svelte'), 'utf8'), /Welcome to SvelteKit/);
    assert.match(await readFile(join(project, 'src/app.d.ts'), 'utf8'), /declare global/);
    assert.match(await readFile(join(project, 'package.json'), 'utf8'), /"prettier"/);
    assert.match(await readFile(join(project, 'LICENSE'), 'utf8'), /Copyright \(c\) 1843 Ada Lovelace's Workshop/);
    const readme = await readFile(join(project, 'README.md'), 'utf8');
    assert.equal((readme.match(/<!-- leftium:creation-recipe -->/g) ?? []).length, 1);
    assert.doesNotMatch(readme, /npx sv create my-app/);
    assert.match(readme, /--no-install$/m);
  }
});

async function shellArgv(command: string): Promise<string[]> {
  const { stdout } = await execFileAsync('sh', ['-c', `set -- ${command}; printf '%s\\0' "$@"`], { encoding: 'buffer' });
  return stdout.toString().split('\0').filter(Boolean);
}
