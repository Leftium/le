import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test, { type TestContext } from 'node:test';
import { create } from 'sv';
import { parseDocument } from 'yaml';
import { runAdd } from '../src/orchestration/add.js';
import { discover } from '../src/project/context.js';
import {
  pagesWorkflowRef,
  planPages,
  reconcileWorkflow,
  verifyStaticOutput,
} from '../src/addons/pages/index.js';

async function fixture(t: TestContext) {
  const app = await realpath(await mkdtemp(join(tmpdir(), 'leftium-pages-')));
  t.after(() => rm(app, { recursive: true, force: true }));
  create({
    cwd: app,
    name: 'fixture',
    template: 'minimal',
    types: 'typescript',
  });
  await writeFile(
    join(app, 'svelte.config.js'),
    `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess(), kit: { adapter: adapter() } };
`,
  );
  await writeFile(
    join(app, 'vite.config.ts'),
    `import { sveltekit } from '@sveltejs/kit/vite'; import { defineConfig } from 'vite'; export default defineConfig({ plugins: [sveltekit()] });`,
  );
  const manifest = JSON.parse(
    await readFile(join(app, 'package.json'), 'utf8'),
  );
  manifest.engines = { node: '24' };
  manifest.packageManager = 'npm@11.6.2';
  await writeFile(
    join(app, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return app;
}
function request(app: string) {
  return {
    addon: 'pages',
    cwd: app,
    repositoryRoot: app,
    repository: 'Ada/app',
    replaceAdapter: true,
    install: false,
  };
}

test('applies standalone Pages, deterministic YAML, and idempotent second run', async (t) => {
  const app = await fixture(t);
  const result = await runAdd(request(app));
  assert.equal(result.status, 'applied', result.message);
  assert.equal(result.pages?.staticBuild, 'skipped');
  assert.equal(result.pages?.remoteDeployment, 'skipped');
  assert.equal(result.verification, 'passed');
  const workflow = await readFile(
    join(app, '.github/workflows/pages.yml'),
    'utf8',
  );
  const doc = parseDocument(workflow);
  assert.deepEqual(doc.errors, []);
  assert.equal(doc.toJS().jobs.pages.uses, pagesWorkflowRef);
  assert.deepEqual(doc.toJS().on.push.branches, ['main']);
  assert.equal(doc.toJS().jobs.pages.with['app-directory'], '.');
  assert.equal(doc.toJS().jobs.pages.with['node-version'], '24');
  assert.match(
    await readFile(join(app, 'svelte.config.js'), 'utf8'),
    /adapter-static/,
  );
  const manifest = JSON.parse(
    await readFile(join(app, 'package.json'), 'utf8'),
  );
  assert.ok(manifest.devDependencies['@sveltejs/adapter-static']);
  assert.equal(manifest.devDependencies['@sveltejs/adapter-auto'], undefined);
  const second = await runAdd(request(app));
  assert.equal(second.status, 'no-op', second.message);
  assert.deepEqual(second.changed, []);
  assert.equal(
    await readFile(join(app, '.github/workflows/pages.yml'), 'utf8'),
    workflow,
  );
});

test('caller version updates preserve comments, branch triggers, commands and extra jobs', async (t) => {
  const app = await fixture(t);
  assert.equal((await runAdd(request(app))).status, 'applied');
  const path = join(app, '.github/workflows/pages.yml');
  const doc = parseDocument(await readFile(path, 'utf8'));
  doc.setIn(['on', 'push', 'branches'], ['release']);
  doc.setIn(['jobs', 'pages', 'with', 'check-script'], '');
  doc.setIn(['jobs', 'lint'], {
    'runs-on': 'ubuntu-latest',
    steps: [{ run: 'echo custom' }],
  });
  doc.commentBefore = 'Keep my caller notes';
  await writeFile(path, doc.toString());
  const ref = 'Leftium/le/.github/workflows/pages.yml@' + 'a'.repeat(40);
  const result = await runAdd({ ...request(app), workflowRef: ref });
  assert.equal(result.status, 'applied', result.message);
  const updated = parseDocument(await readFile(path, 'utf8'));
  assert.equal(updated.toJS().jobs.pages.uses, ref);
  assert.deepEqual(updated.toJS().on.push.branches, ['release']);
  assert.equal(updated.toJS().jobs.pages.with['check-script'], '');
  assert.ok(updated.toJS().jobs.lint);
  assert.match(updated.toString(), /Keep my caller notes/);
});

test('unsupported server behavior and adapter/workflow conflicts stop before mutation', async (t) => {
  for (const [path, content] of [
    [
      'src/routes/+page.server.ts',
      'export const actions = { default: async () => {} };',
    ],
    [
      'src/routes/+page.server.ts',
      'export const load = ({ cookies }) => cookies.get("user");',
    ],
    ['src/routes/+page.ts', 'export const prerender = false;'],
    [
      'src/hooks.server.ts',
      'export const handle = async ({event, resolve}) => resolve(event);',
    ],
    [
      'svelte.config.js',
      "import adapter from '@sveltejs/adapter-node'; export default { kit: { adapter: adapter() } };",
    ],
    [
      'svelte.config.js',
      "import adapter from '@sveltejs/adapter-static'; export default { kit: { adapter: adapter({ pages: output }) } };",
    ],
    [
      '.github/workflows/pages.yml',
      'jobs:\n  custom:\n    runs-on: ubuntu-latest\n',
    ],
    [
      '.github/workflows/old.yml',
      'jobs:\n  deploy:\n    steps:\n      - uses: actions/deploy-pages@v5\n',
    ],
  ] as const) {
    const app = await fixture(t);
    await mkdir(join(app, path, '..'), { recursive: true });
    await writeFile(join(app, path), content);
    const original = await readFile(join(app, 'package.json'), 'utf8');
    const result = await runAdd(request(app));
    assert.ok(
      ['unsupported', 'conflict'].includes(result.status),
      result.message,
    );
    assert.deepEqual(result.changed, []);
    assert.equal(await readFile(join(app, 'package.json'), 'utf8'), original);
  }
});

test('prerender-only server load is supported; root/custom domains and CNAME are preserved', async (t) => {
  const app = await fixture(t);
  await writeFile(
    join(app, 'src/routes/+page.server.ts'),
    'export const load = async () => ({ message: "build time" });',
  );
  await writeFile(join(app, 'static/CNAME'), 'example.com\n');
  const conflicting = await runAdd(request(app));
  assert.equal(conflicting.status, 'conflict');
  const result = await runAdd({
    ...request(app),
    siteUrl: 'https://example.com/',
  });
  assert.equal(result.status, 'applied', result.message);
  assert.equal(
    await readFile(join(app, 'static/CNAME'), 'utf8'),
    'example.com\n',
  );
  assert.match(result.pages!.followUp.join('\n'), /DNS manually/);
  assert.match(
    await readFile(join(app, 'svelte.config.js'), 'utf8'),
    /base: ""/,
  );
  const root = await fixture(t);
  assert.equal(
    (await runAdd({ ...request(root), repository: 'Ada/ada.github.io' }))
      .status,
    'applied',
  );
  assert.match(
    await readFile(join(root, 'svelte.config.js'), 'utf8'),
    /base: ""/,
  );
});

test('missing metadata, replacement choice, unsupported workspace and symlink paths stop safely', async (t) => {
  const app = await fixture(t);
  const noChoice = await runAdd({ ...request(app), replaceAdapter: false });
  assert.equal(noChoice.status, 'conflict');
  const canceled = await runAdd(
    { ...request(app), replaceAdapter: false },
    { text: async () => undefined, confirm: async () => undefined },
  );
  assert.equal(canceled.status, 'canceled');
  const confirmed = await runAdd(
    { ...request(app), replaceAdapter: false },
    { text: async () => undefined, confirm: async () => true },
  );
  assert.equal(confirmed.status, 'applied');
  const missing = await fixture(t);
  const metadata = JSON.parse(
    await readFile(join(missing, 'package.json'), 'utf8'),
  );
  delete metadata.engines;
  await writeFile(join(missing, 'package.json'), JSON.stringify(metadata));
  assert.equal((await runAdd(request(missing))).status, 'unsupported');
  await writeFile(join(missing, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  assert.equal(
    (await runAdd({ ...request(missing), nodeVersion: '24' })).status,
    'conflict',
  );
  const workspace = await fixture(t);
  const pkg = JSON.parse(
    await readFile(join(workspace, 'package.json'), 'utf8'),
  );
  pkg.workspaces = ['packages/*'];
  await writeFile(join(workspace, 'package.json'), JSON.stringify(pkg));
  assert.equal((await runAdd(request(workspace))).status, 'unsupported');
  const linked = await fixture(t);
  const elsewhere = await fixture(t);
  await symlink(elsewhere, join(linked, '.github'), 'dir');
  const result = await runAdd(request(linked));
  assert.equal(result.status, 'conflict');
  assert.deepEqual(result.changed, []);
});

test('caller rejects floating refs, unknown inputs and output conflicts', () => {
  const inputs = { 'publish-directory': 'build', 'build-script': 'build' };
  assert.throws(() =>
    reconcileWorkflow(
      undefined,
      inputs,
      'Leftium/le/.github/workflows/pages.yml@main',
    ),
  );
  const generated = reconcileWorkflow(undefined, inputs, pagesWorkflowRef);
  for (const text of [
    generated.replace('publish-directory: build', 'publish-directory: other'),
    generated.replace('build-script: build', 'unknown: custom'),
    generated.replace('pages: write', 'pages: read'),
  ])
    assert.throws(() => reconcileWorkflow(text, inputs, pagesWorkflowRef));
});

test('static output checks detect missing routes, assets, and wrong project base paths', async (t) => {
  const app = await fixture(t);
  const plan = await planPages(await discover(app), request(app));
  await mkdir(join(app, 'build/_app'), { recursive: true });
  await writeFile(join(app, 'build/_app/app.js'), 'export {};');
  await writeFile(
    join(app, 'build/index.html'),
    '<script src="/app/_app/app.js"></script>',
  );
  await verifyStaticOutput(plan);
  await writeFile(
    join(app, 'build/index.html'),
    '<script src="/_app/app.js"></script>',
  );
  await assert.rejects(verifyStaticOutput(plan), /base path/);
  await writeFile(
    join(app, 'build/index.html'),
    '<script src="/app/missing.js"></script>',
  );
  await assert.rejects(verifyStaticOutput(plan), /Missing static asset/);
  await rm(join(app, 'build/index.html'));
  await assert.rejects(verifyStaticOutput(plan), /no HTML/);
});

test('CLI routes pages to Leftium and reports skipped verification', async (t) => {
  const app = await fixture(t);
  const result = spawnSync(
    process.execPath,
    [
      resolve('dist/src/cli/index.js'),
      'add',
      'pages',
      '--cwd',
      app,
      '--repository-root',
      app,
      '--repository',
      'Ada/app',
      '--replace-adapter',
      '--no-install',
      '--non-interactive',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    /static build skipped; remote deployment skipped/,
  );
  assert.match(result.stdout, /follow-up/);
  assert.doesNotMatch(result.stdout, /Delegating/);
});

for (const stage of ['install', 'build'] as const) {
  test(`package ${stage} failure reports partial effects and accurate build state`, async (t) => {
    const app = await fixture(t);
    const bin = join(app, 'test-bin');
    await mkdir(bin);
    await writeFile(
      join(bin, 'npm'),
      `#!/bin/sh\nif [ "$1" = install ]; then echo '{}' > package-lock.json; ${stage === 'install' ? 'exit 23' : 'exit 0'}; fi\nif [ "$2" = build ]; then exit 23; fi\nexit 0\n`,
      { mode: 0o755 },
    );
    const previousPath = process.env.PATH;
    process.env.PATH = `${bin}:${previousPath}`;
    t.after(() => {
      process.env.PATH = previousPath;
    });
    const result = await runAdd({ ...request(app), install: true });
    assert.equal(result.status, 'failed');
    assert.equal(result.pages?.localConfiguration, 'applied');
    assert.equal(
      result.pages?.staticBuild,
      stage === 'install' ? 'skipped' : 'failed',
    );
    assert.equal(result.pages?.remoteDeployment, 'skipped');
    assert.equal(result.verification, 'failed');
    assert.ok(result.changed.includes(join(app, 'package-lock.json')));
    assert.match(result.message, /Partial output remains/);
  });
}
