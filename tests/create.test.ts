import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCreate } from '../src/orchestration/create.js';

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
  assert.match(readme, /leftium@0\.1\.0 create/);
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

test('records the same portable recipe for a replay into a fresh destination', async () => {
  const first = await destination('replay-app');
  const second = await destination('replay-app');
  await runCreate({ cwd: first, install: false });
  await runCreate({ cwd: second, install: false });
  const command = /```sh\n([^\n]+)/.exec(await readFile(join(first, 'README.md'), 'utf8'))?.[1];
  const replay = /```sh\n([^\n]+)/.exec(await readFile(join(second, 'README.md'), 'utf8'))?.[1];
  assert.equal(command, replay);
  assert.match(command ?? '', /^pnpm dlx leftium@0\.1\.0 create replay-app/);
  assert.match(command ?? '', /--no-install$/);
  assert.doesNotMatch(command ?? '', /--package-manager/);
});
