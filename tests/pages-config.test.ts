import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'acorn';
import { configureSvelte, siteBase } from '../src/addons/pages/config.js';

const auto = `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
const config = { preprocess: vitePreprocess(), kit: { adapter: adapter(), alias: { '$lib': './src/lib' } } };
export default config;`;

test('canonical site paths cover project, root and custom domains', () => {
  assert.deepEqual(siteBase('Ada/app'), { base: '/app' });
  assert.deepEqual(siteBase('Ada/ada.github.io'), { base: '' });
  assert.deepEqual(siteBase('Ada/app', 'https://ada.github.io/app/'), {
    base: '/app',
  });
  assert.deepEqual(siteBase('Ada/app', 'https://example.com/'), {
    base: '',
    domain: 'example.com',
  });
  for (const url of [
    'https://ada.github.io/wrong',
    'https://other.github.io/app',
    'https://example.com/app',
  ])
    assert.throws(() => siteBase('Ada/app', url));
  assert.throws(() => siteBase('bad'));
  assert.throws(() => siteBase('Ada/app', 'http://example.com'));
});

test('recognized default adapter requires replacement and preserves unrelated configuration', () => {
  assert.equal(configureSvelte(auto, '/app', false).needsReplacement, true);
  const configured = configureSvelte(auto, '/app', true);
  parse(configured.text, { ecmaVersion: 'latest', sourceType: 'module' });
  assert.match(configured.text, /adapter-static/);
  assert.match(configured.text, /preprocess: vitePreprocess\(\)/);
  assert.match(configured.text, /alias: \{ '\$lib': '.\/src\/lib' \}/);
  assert.match(configured.text, /base: "\/app"/);
  assert.equal(
    configureSvelte(configured.text, '/app', false).text,
    configured.text,
  );
});

test('new and existing static configs preserve options and detect output', () => {
  for (const config of ['export default {};', 'export default { kit: {} };']) {
    const result = configureSvelte(config, '', false);
    parse(result.text, { ecmaVersion: 'latest', sourceType: 'module' });
    assert.equal(configureSvelte(result.text, '', false).text, result.text);
  }
  const result = configureSvelte(
    `import adapter from '@sveltejs/adapter-static'; export default { kit: { adapter: adapter({ pages: 'public-site', assets: 'public-site', precompress: true }), paths: { base: '' } } };`,
    '',
    false,
  );
  assert.equal(result.output, 'public-site');
  assert.match(result.text, /precompress: true/);
});

test('unsupported adapters, dynamic config, fallback, output and base conflicts stop', () => {
  for (const config of [
    auto.replace('adapter-auto', 'adapter-node'),
    auto
      .replace('adapter()', "adapter({ fallback: 'index.html' })")
      .replace('adapter-auto', 'adapter-static'),
    auto
      .replace('adapter()', 'adapter({ pages: output })')
      .replace('adapter-auto', 'adapter-static'),
    auto
      .replace('adapter()', "adapter({ pages: '../outside' })")
      .replace('adapter-auto', 'adapter-static'),
    auto
      .replace('adapter()', "adapter({ assets: 'other' })")
      .replace('adapter-auto', 'adapter-static'),
    'export default { kit: { paths: { base: "/wrong" } } };',
    'export default { ...custom };',
    'export default makeConfig();',
  ])
    assert.throws(() => configureSvelte(config, '/app', true));
});

test('current inline Vite options preserve unrelated Vite and compiler settings', async () => {
  const { configureVite } = await import('../src/addons/pages/config.js');
  const source = `import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
export default defineConfig({ server: { port: 5000 }, plugins: [sveltekit({ compilerOptions: { runes: true }, adapter: adapter() })] });`;
  assert.equal(configureVite(source, '/app', false)!.needsReplacement, true);
  const result = configureVite(source, '/app', true)!;
  parse(result.text, { ecmaVersion: 'latest', sourceType: 'module' });
  assert.match(result.text, /server: \{ port: 5000 \}/);
  assert.match(result.text, /compilerOptions: \{ runes: true \}/);
  assert.match(result.text, /adapter-static/);
  assert.equal(configureVite(result.text, '/app', false)!.text, result.text);
  assert.equal(
    configureVite(
      "import { sveltekit } from '@sveltejs/kit/vite'; export default { plugins: [sveltekit()] };",
      '',
      false,
    ),
    undefined,
  );
});
