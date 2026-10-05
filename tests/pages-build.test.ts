import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { create } from 'sv';
import { runAdd } from '../src/orchestration/add.js';

// Network installation is opt-in; ordinary unit tests remain offline.
// Run: LE_PAGES_BUILD_TEST=1 pnpm test
for (const [repository, siteUrl] of [
  ['Ada/app', undefined],
  ['Ada/ada.github.io', undefined],
  ['Ada/app', 'https://example.com/'],
] as const) {
  test(
    `real SvelteKit static build: ${siteUrl ?? repository}`,
    { skip: process.env.LE_PAGES_BUILD_TEST !== '1', timeout: 180000 },
    async (t) => {
      const app = await realpath(
        await mkdtemp(join(tmpdir(), 'leftium-pages-build-')),
      );
      t.after(() => rm(app, { recursive: true, force: true }));
      create({
        cwd: app,
        name: 'fixture',
        template: 'minimal',
        types: 'typescript',
      });
      const metadata = JSON.parse(
        await readFile(join(app, 'package.json'), 'utf8'),
      );
      metadata.engines = { node: '24' };
      await writeFile(
        join(app, 'package.json'),
        JSON.stringify(metadata, null, 2),
      );
      const base = siteUrl || repository.endsWith('.github.io') ? '' : '/app';
      await writeFile(
        join(app, 'src/routes/+page.svelte'),
        `<a href="${base}/about/">About</a><img src="${base}/mark.svg" alt="mark" />`,
      );
      await mkdir(join(app, 'src/routes/about'));
      await writeFile(
        join(app, 'src/routes/about/+page.svelte'),
        '<h1>About</h1>',
      );
      await writeFile(
        join(app, 'src/routes/about/+page.server.ts'),
        'export const load = async () => ({ message: "prerender only" });',
      );
      await writeFile(
        join(app, 'static/mark.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      );
      const request = {
        addon: 'pages',
        cwd: app,
        repositoryRoot: app,
        repository,
        siteUrl,
        packageManager: 'npm',
        replaceAdapter: true,
      };
      const result = await runAdd(request);
      assert.equal(result.status, 'applied', result.message);
      assert.equal(result.pages?.staticBuild, 'passed');
      assert.equal(result.pages?.remoteDeployment, 'skipped');
      assert.match(
        await readFile(join(app, 'build/about/index.html'), 'utf8'),
        /About/,
      );
      assert.ok(await readFile(join(app, 'build/mark.svg'), 'utf8'));
      assert.ok(await readFile(join(app, 'package-lock.json'), 'utf8'));
      const second = await runAdd({ ...request, install: false });
      assert.equal(second.status, 'no-op', second.message);
    },
  );
}
