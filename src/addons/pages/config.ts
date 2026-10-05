import { parse } from 'acorn';
import { Stopped } from '../../orchestration/stopped.js';

type Syntax = {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
};
type Patch = { start: number; end: number; text: string };
function conflict(message: string): never {
  throw new Stopped(
    'conflict',
    `${message} Resolve the Svelte config explicitly and retry.`,
  );
}
function node(value: unknown): Syntax {
  return value as Syntax;
}
function object(value: unknown, label: string): Syntax {
  const result = node(value);
  if (result?.type !== 'ObjectExpression')
    conflict(`${label} must be a literal object.`);
  const properties = result.properties as Syntax[];
  const names = new Set<string>();
  for (const property of properties) {
    if (
      property.type !== 'Property' ||
      property.computed ||
      property.method ||
      property.kind !== 'init'
    )
      conflict(`${label} has unsupported dynamic properties.`);
    const name = String(node(property.key).name ?? node(property.key).value);
    if (names.has(name)) conflict(`${label} has duplicate properties.`);
    names.add(name);
  }
  return result;
}
function property(value: Syntax, key: string): Syntax | undefined {
  return (value.properties as Syntax[]).find(
    (p) => (node(p.key).name ?? node(p.key).value) === key,
  );
}
function literal(value: unknown): unknown {
  const result = node(value);
  return result?.type === 'Literal' ? result.value : undefined;
}

export function siteBase(
  repository: string,
  siteUrl?: string,
): { base: string; domain?: string } {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
    throw new Stopped('unsupported', 'Supply --repository owner/repository.');
  const [owner, repo] = repository.split('/') as [string, string];
  const root = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  if (!siteUrl) return { base: root ? '' : `/${repo}` };
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    throw new Stopped('unsupported', 'Supply an absolute HTTPS --site-url.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  )
    throw new Stopped(
      'unsupported',
      '--site-url must be an HTTPS URL without credentials, port, query, or fragment.',
    );
  const path = url.pathname.replace(/\/$/, '');
  if (url.hostname === `${owner.toLowerCase()}.github.io`) {
    const base = root ? '' : `/${repo}`;
    if (path !== base)
      throw new Stopped(
        'conflict',
        `The canonical GitHub Pages path for ${repository} is ${base || '/'}.`,
      );
    return { base };
  }
  if (url.hostname.endsWith('.github.io') || path)
    throw new Stopped(
      'conflict',
      'A custom domain must use its root URL; GitHub Pages aliases need HTTP redirects.',
    );
  return { base: '', domain: url.hostname };
}

export function configureSvelte(
  text: string,
  base: string,
  replaceAdapter: boolean,
): { text: string; output: string; needsReplacement: boolean } {
  let ast: Syntax;
  try {
    ast = parse(text, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    }) as unknown as Syntax;
  } catch {
    return conflict('Only parseable JavaScript Svelte configs are supported.');
  }
  const body = ast.body as Syntax[];
  const exported = body.find((n) => n.type === 'ExportDefaultDeclaration');
  let declaration = node(exported?.declaration);
  if (declaration?.type === 'Identifier') {
    const declarations = body
      .filter((n) => n.type === 'VariableDeclaration')
      .flatMap((n) => n.declarations as Syntax[]);
    declaration = node(
      declarations.find((n) => node(n.id).name === declaration.name)?.init,
    );
  }
  const config = object(declaration, 'The default export');
  const kitProperty = property(config, 'kit');
  const patches: Patch[] = [];
  function set(target: Syntax, key: string, value: string) {
    const existing = property(target, key);
    if (existing)
      patches.push({
        start: node(existing.value).start,
        end: node(existing.value).end,
        text: value,
      });
    else {
      const properties = target.properties as Syntax[];
      const last = properties.at(-1);
      // Insert before the last property's end instead of competing insertions at
      // the closing brace. Multiple additions share one patch below.
      const start = target.end - 1;
      const found = patches.find((p) => p.start === start && p.end === start);
      const separator =
        last && !text.slice(last.end, start).includes(',') ? ',' : '';
      if (found) found.text += `\n${key}: ${value},`;
      else
        patches.push({
          start,
          end: start,
          text: `${separator}\n${key}: ${value},\n`,
        });
    }
  }
  let output = 'build';
  let needsReplacement = false;
  const imports = body.filter(
    (n) =>
      n.type === 'ImportDeclaration' &&
      typeof literal(n.source) === 'string' &&
      String(literal(n.source)).startsWith('@sveltejs/adapter-'),
  );
  if (imports.length > 1) conflict('Multiple adapter imports are ambiguous.');
  const adapterImport = imports[0];
  let adapterName = 'leftiumStaticAdapter';
  if (adapterImport) {
    const source = literal(adapterImport.source);
    if (
      source !== '@sveltejs/adapter-auto' &&
      source !== '@sveltejs/adapter-static'
    )
      conflict(`Unsupported adapter ${String(source)}.`);
    const specifiers = adapterImport.specifiers as Syntax[];
    if (
      specifiers.length !== 1 ||
      specifiers[0]?.type !== 'ImportDefaultSpecifier'
    )
      conflict('The adapter must use a default import.');
    adapterName = String(node(specifiers[0]!.local).name);
    needsReplacement = source === '@sveltejs/adapter-auto';
    if (needsReplacement && !replaceAdapter)
      return { text, output, needsReplacement };
    if (needsReplacement)
      patches.push({
        start: node(adapterImport.source).start,
        end: node(adapterImport.source).end,
        text: "'@sveltejs/adapter-static'",
      });
  } else {
    if (new RegExp(`\\b${adapterName}\\b`).test(text))
      conflict('The generated adapter import name is already used.');
    patches.push({
      start: 0,
      end: 0,
      text: `import ${adapterName} from '@sveltejs/adapter-static';\n`,
    });
  }
  if (!kitProperty)
    set(
      config,
      'kit',
      `{ adapter: ${adapterName}(), paths: { base: ${JSON.stringify(base)} } }`,
    );
  else {
    const kit = object(kitProperty.value, 'kit');
    const adapter = property(kit, 'adapter');
    if (adapter) {
      const call = node(adapter.value);
      if (
        !adapterImport ||
        call.type !== 'CallExpression' ||
        node(call.callee).name !== adapterName
      )
        conflict('The adapter expression is unsupported.');
      const args = call.arguments as Syntax[];
      if (args.length > 1) conflict('The adapter options are ambiguous.');
      if (args.length) {
        const options = object(args[0], 'Adapter options');
        if (needsReplacement && (options.properties as Syntax[]).length)
          conflict('adapter-auto options cannot be migrated automatically.');
        for (const option of ['fallback', 'strict']) {
          const p = property(options, option);
          if (
            p &&
            (option === 'fallback'
              ? literal(p.value) !== undefined
              : literal(p.value) !== true)
          )
            conflict(
              'SPA fallback and non-strict static output are unsupported.',
            );
          if (
            p &&
            node(p.value).type !== 'Identifier' &&
            literal(p.value) === undefined
          )
            conflict('Dynamic adapter options are unsupported.');
        }
        const pages = property(options, 'pages');
        const assets = property(options, 'assets');
        if (pages) {
          const value = literal(pages.value);
          if (
            typeof value !== 'string' ||
            !/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(value) ||
            value.split('/').includes('..') ||
            value.startsWith('.')
          )
            conflict('The adapter output directory is unknown or unsafe.');
          output = value;
        }
        if (assets && literal(assets.value) !== output)
          conflict(
            'Separate or unknown adapter asset directories are unsupported.',
          );
        for (const p of options.properties as Syntax[]) {
          const key = node(p.key).name ?? node(p.key).value;
          if (
            !['pages', 'assets', 'fallback', 'strict', 'precompress'].includes(
              String(key),
            )
          )
            conflict('Unknown static adapter options are unsupported.');
        }
      }
    } else {
      if (adapterImport)
        conflict('An unused adapter import requires manual reconciliation.');
      set(kit, 'adapter', `${adapterName}()`);
    }
    const pathsProperty = property(kit, 'paths');
    if (pathsProperty) {
      const paths = object(pathsProperty.value, 'kit.paths');
      const current = property(paths, 'base');
      if (current && literal(current.value) !== base)
        conflict(
          'The existing base path conflicts with the canonical site URL.',
        );
      const assets = property(paths, 'assets');
      if (assets && literal(assets.value) !== '')
        conflict('An external kit.paths.assets setting is unsupported.');
      if (!current) set(paths, 'base', JSON.stringify(base));
    } else set(kit, 'paths', `{ base: ${JSON.stringify(base)} }`);
  }
  for (const patch of patches.sort((a, b) => b.start - a.start))
    text = text.slice(0, patch.start) + patch.text + text.slice(patch.end);
  return { text, output, needsReplacement };
}
