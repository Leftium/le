import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const placeholder = '__LEFTIUM_PAGES_RELEASE_SHA__';
export const workflowPrefix = 'Leftium/le/.github/workflows/pages.yml@';

export function releaseSha(env, head) {
  const sha = env.LEFTIUM_RELEASE_SHA;
  if (env.LEFTIUM_RELEASE === '1' || sha !== undefined) {
    for (const [name, value] of Object.entries({
      LEFTIUM_RELEASE_SHA: sha,
      GITHUB_SHA: env.GITHUB_SHA,
    })) {
      assert.match(value ?? '', /^[a-f0-9]{40}$/, `${name} must be a full SHA`);
    }
    assert.equal(sha, env.GITHUB_SHA, 'Release SHA must equal GITHUB_SHA');
    assert.equal(sha, head, 'Release SHA must equal checkout HEAD');
    return sha;
  }
  assert.match(
    head,
    /^[a-f0-9]{40}$/,
    'Local checkout HEAD must be a full SHA',
  );
  return head;
}

export function stamp(source, sha) {
  assert.match(sha, /^[a-f0-9]{40}$/);
  assert.equal(
    source.split(placeholder).length,
    2,
    'Expected one unstamped placeholder',
  );
  return source.replace(placeholder, sha);
}

export function checkVersion(base, head = 'HEAD', cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  // Resolve first so a missing or option-like base cannot silently skip the guard.
  const baseCommit = git('rev-parse', '--verify', `${base}^{commit}`);
  const headCommit = git('rev-parse', '--verify', `${head}^{commit}`);
  const changed = git(
    'diff',
    '--name-only',
    baseCommit,
    headCommit,
    '--',
    '.github/workflows/pages.yml',
  );
  if (!changed) return;
  const version = (ref) =>
    JSON.parse(git('show', `${ref}:package.json`)).version;
  assert.notEqual(
    version(baseCommit),
    version(headCommit),
    'Pages workflow changes require a package.json version bump',
  );
}

export async function verifyArtifact(root, sha) {
  assert.match(
    sha ?? '',
    /^[a-f0-9]{40}$/,
    'Artifact verification requires a full SHA',
  );
  const { pagesWorkflowRef, reconcileWorkflow } = await import(
    pathToFileURL(resolve(root, 'dist/src/addons/pages/index.js')).href
  );
  assert.equal(
    pagesWorkflowRef,
    workflowPrefix + sha,
    'Artifact default must equal release SHA',
  );
  const inputs = { 'publish-directory': 'build', 'build-script': 'build' };
  const caller = reconcileWorkflow(undefined, inputs, pagesWorkflowRef);
  assert.ok(
    caller.includes(`uses: ${workflowPrefix}${sha}`),
    'Generated caller must contain release SHA',
  );
  assert.ok(
    caller.includes(`/blob/${sha}/docs/pages.md`),
    'Caller docs must use release SHA',
  );
  const override =
    workflowPrefix + (sha === 'a'.repeat(40) ? 'b' : 'a').repeat(40);
  assert.ok(
    reconcileWorkflow(undefined, inputs, override).includes(
      `uses: ${override}`,
    ),
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'stamp') {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    const sha = releaseSha(process.env, head);
    const path = 'dist/src/addons/pages/ref.js';
    writeFileSync(path, stamp(readFileSync(path, 'utf8'), sha));
    console.log(`Stamped Pages workflow: ${sha}`);
  } else if (command === 'check-version') {
    assert.ok(args[0], 'A comparison base is required');
    checkVersion(args[0], args[1]);
    console.log('Pages workflow/package version invariant passed');
  } else if (command === 'verify') {
    const sha = releaseSha(
      process.env,
      execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    );
    await verifyArtifact(args[0] ?? '.', sha);
    console.log(`Verified artifact caller: ${sha}`);
  } else {
    throw new Error(
      'Use stamp, check-version BASE [HEAD], or verify PACKAGE_ROOT',
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
