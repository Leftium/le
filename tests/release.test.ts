import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  checkVersion,
  placeholder,
  releaseSha,
  stamp,
  verifyArtifact,
} from '../scripts/release.mjs';

const sha = 'a'.repeat(40);
const other = 'b'.repeat(40);

test('release mode fails closed on missing, invalid, and mismatched SHAs', () => {
  const valid = {
    LEFTIUM_RELEASE: '1',
    LEFTIUM_RELEASE_SHA: sha,
    GITHUB_SHA: sha,
  };
  assert.equal(releaseSha(valid, sha), sha);
  assert.equal(releaseSha({}, other), other);
  for (const env of [
    { LEFTIUM_RELEASE: '1' },
    { ...valid, LEFTIUM_RELEASE_SHA: undefined },
    { ...valid, GITHUB_SHA: undefined },
    { ...valid, LEFTIUM_RELEASE_SHA: 'main' },
    { ...valid, GITHUB_SHA: 'abc123' },
    { ...valid, LEFTIUM_RELEASE_SHA: other },
    { LEFTIUM_RELEASE_SHA: sha },
    { ...valid, LEFTIUM_RELEASE_SHA: 'A'.repeat(40) },
  ])
    assert.throws(() => releaseSha(env, sha));
  assert.throws(() => releaseSha(valid, other));
});

test('stamping only accepts one placeholder and a full SHA', () => {
  assert.equal(stamp(`ref@${placeholder}`, sha), `ref@${sha}`);
  assert.throws(() => stamp('already stamped', sha));
  assert.throws(() => stamp(placeholder.repeat(2), sha));
  assert.throws(() => stamp(placeholder, 'main'));
});

test('compiled artifact generates a caller pinned to checkout SHA and preserves overrides', async () => {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  await verifyArtifact('.', head);
  await assert.rejects(verifyArtifact('.', head === sha ? other : sha));
  await assert.rejects(verifyArtifact('.', 'main'));
});

test('version guard compares accepted snapshots and rejects workflow-only changes', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'leftium-release-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Release test');
  git('config', 'user.email', 'release@example.test');
  git('config', 'commit.gpgsign', 'false');
  mkdirSync(join(cwd, '.github/workflows'), { recursive: true });
  const manifest = join(cwd, 'package.json');
  const workflow = join(cwd, '.github/workflows/pages.yml');
  writeFileSync(manifest, JSON.stringify({ version: '1.0.0' }));
  writeFileSync(workflow, 'v1');
  git('add', '.');
  git('commit', '-qm', 'fixture');
  const base = git('rev-parse', 'HEAD');
  checkVersion(base, 'HEAD', cwd);
  writeFileSync(workflow, 'v2');
  git('add', '.');
  git('commit', '-qm', 'workflow only');
  assert.throws(() => checkVersion(base, 'HEAD', cwd), /version bump/);
  writeFileSync(manifest, JSON.stringify({ version: '1.0.1' }));
  git('add', '.');
  git('commit', '-qm', 'version bump');
  checkVersion(base, 'HEAD', cwd);
  assert.throws(() => checkVersion('missing-base', 'HEAD', cwd));
  const workflowBase = git('rev-parse', 'HEAD');
  writeFileSync(manifest, JSON.stringify({ version: '1.0.2' }));
  git('add', '.');
  git('commit', '-qm', 'CLI only release');
  checkVersion(workflowBase, 'HEAD', cwd);
});
