import { execFile } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { promisify } from 'node:util';
import {
  parseTree,
  getNodeValue,
  type Node,
  type ParseError,
} from 'jsonc-parser';
import { minimatch } from 'minimatch';
import { parseDocument } from 'yaml';
import { readRegular } from './files.js';

const exec = promisify(execFile);
export type Manifest = {
  path: string;
  text: string;
  data: Record<string, unknown>;
};
export type ProjectContext = {
  target: string;
  packageRoot?: string;
  workspaceRoot?: string;
  gitRoot?: string;
  manifest?: Manifest;
};

export function parseManifest(text: string, path: string): Manifest {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, {
    disallowComments: true,
    allowTrailingComma: false,
  });
  if (!tree || tree.type !== 'object' || errors.length)
    throw new Error(`Invalid package.json: ${path}`);
  function rejectDuplicates(node: Node): void {
    if (node.type === 'object') {
      const names = node.children?.map(
        (property) => property.children?.[0]?.value,
      );
      if (names && new Set(names).size !== names.length)
        throw new Error(`Duplicate package.json keys: ${path}`);
    }
    node.children?.forEach(rejectDuplicates);
  }
  rejectDuplicates(tree);
  return { path, text, data: getNodeValue(tree) as Record<string, unknown> };
}

export async function gitValue(
  cwd: string,
  args: string[],
): Promise<string | undefined> {
  try {
    const { stdout } = await exec('git', ['-C', cwd, ...args], {
      timeout: 3000,
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function workspacePatterns(data: unknown): string[] | undefined {
  const patterns = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'packages' in data
      ? data.packages
      : undefined;
  return Array.isArray(patterns) &&
    patterns.every((value) => typeof value === 'string')
    ? patterns
    : undefined;
}

function includesPackage(
  root: string,
  member: string,
  patterns: string[],
): boolean {
  const path = relative(root, member).split('\\').join('/');
  return (
    patterns
      .filter((p) => !p.startsWith('!'))
      .some((p) => minimatch(path, p)) &&
    !patterns
      .filter((p) => p.startsWith('!'))
      .some((p) => minimatch(path, p.slice(1)))
  );
}

export async function discover(cwd: string): Promise<ProjectContext> {
  const target = await realpath(cwd);
  if (!(await stat(target)).isDirectory())
    throw new Error(`Target is not a directory: ${target}`);
  const context: ProjectContext = { target };
  for (let directory = target; ; directory = dirname(directory)) {
    const path = join(directory, 'package.json');
    const text = await readRegular(path);
    let manifest: Manifest | undefined;
    if (text !== undefined) {
      // Only the target manifest is edited. Malformed ancestor metadata is not a
      // universal prerequisite for a generic directory operation.
      if (directory === target) manifest = parseManifest(text, path);
      else {
        try {
          manifest = parseManifest(text, path);
        } catch {
          /* No inference. */
        }
      }
      if (manifest && !context.packageRoot) context.packageRoot = directory;
      if (directory === target) context.manifest = manifest;
    }
    if (!context.workspaceRoot) {
      let patterns = workspacePatterns(manifest?.data.workspaces);
      const yaml = await readRegular(join(directory, 'pnpm-workspace.yaml'));
      if (yaml !== undefined) {
        const document = parseDocument(yaml);
        if (document.errors.length === 0)
          patterns = workspacePatterns(document.toJS());
      }
      if (
        patterns &&
        (directory === target ||
          (context.packageRoot &&
            includesPackage(directory, context.packageRoot, patterns)))
      ) {
        context.workspaceRoot = directory;
      }
    }
    if (dirname(directory) === directory) break;
  }
  context.gitRoot = await gitValue(target, ['rev-parse', '--show-toplevel']);
  return context;
}
