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
for (const [repository, siteUrl, manager, mode] of [
  ['Ada/app', undefined, 'npm'],
  ['Ada/ada.github.io', undefined, 'npm'],
  ['Ada/app', 'https://example.com/', 'npm'],
  ['Ada/pnpm-app', undefined, 'pnpm'],
  ['Ada/legacy-app', undefined, 'npm', 'legacy'],
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
      if (manager === 'pnpm') metadata.packageManager = 'pnpm@12.3.4';
      await writeFile(
        join(app, 'package.json'),
        JSON.stringify(metadata, null, 2),
      );
      if (mode === 'legacy') {
        await writeFile(
          join(app, 'vite.config.ts'),
          `import { sveltekit } from '@sveltejs/kit/vite'; import { defineConfig } from 'vite'; export default defineConfig({ plugins: [sveltekit()] });`,
        );
        await writeFile(
          join(app, 'svelte.config.js'),
          `import adapter from '@sveltejs/adapter-auto'; import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'; export default { preprocess: vitePreprocess(), kit: { adapter: adapter() } };`,
        );
      }
      const base =
        siteUrl || repository.endsWith('.github.io')
          ? ''
          : `/${repository.split('/')[1]}`;
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
        packageManager: manager,
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
      assert.ok(
        await readFile(
          join(app, manager === 'npm' ? 'package-lock.json' : 'pnpm-lock.yaml'),
          'utf8',
        ),
      );
      const second = await runAdd({ ...request, install: false });
      assert.equal(second.status, 'no-op', second.message);
    },
  );
}
