import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { Stopped } from '../../orchestration/stopped.js';
import type { ProjectContext } from '../../project/context.js';
import { readRegular, type Mutation } from '../../project/files.js';

export type GitattributesRequest = {
  cwd?: string;
  preset?: string | string[];
  install?: boolean;
};
export type Preset = { lines: string[] } | { presets: string[] };
export type PresetCatalog = Record<string, Preset>;

// TODO: Revisit ownership when add-ons can compose other add-ons. The
// gitattributes preset should then own only attributes, while a gitconfig
// add-on owns the driver and a nodiff add-on composes both. Keep setup atomic
// here until that composition exists; a printed follow-up command is too easy
// to skip and would leave the generated attribute only partly configured.
export type GitConfigPlan = {
  root: string;
  key: typeof nodiffDriverKey;
  value: typeof nodiffDriverValue;
  install: boolean;
};
export type GitattributesPlan = {
  edits: Mutation[];
  gitConfig?: GitConfigPlan;
};

const exec = promisify(execFile);
export const nodiffDriverKey = 'diff.nodiff.command';
export const nodiffDriverValue = 'f () { echo "Diff skipped: $1"; }; f "$1"';

export const builtinPresets: PresetCatalog = {
  nodiff: {
    lines: readFileSync(
      new URL('./templates/nodiff.txt', import.meta.url),
      'utf8',
    )
      .trimEnd()
      .split(/\r?\n/),
  },
  eol: {
    lines: readFileSync(new URL('./templates/eol.txt', import.meta.url), 'utf8')
      .trimEnd()
      .split(/\r?\n/),
  },
};

const begin = '# BEGIN LEFTIUM GITATTRIBUTES';
const end = '# END LEFTIUM GITATTRIBUTES';

function requestedNames(value: GitattributesRequest['preset']): string[] {
  if (value === undefined || (Array.isArray(value) && value.length === 0))
    return ['nodiff'];
  return Array.isArray(value) ? value : [value];
}

/** Resolves ordered native-format presets without admitting duplicates or cycles. */
export function resolvePresets(
  requested: string[],
  catalog: PresetCatalog = builtinPresets,
): { names: string[]; lines: string[] } {
  const names: string[] = [];
  const lines: string[] = [];
  const seen = new Set<string>();
  const lineSet = new Set<string>();
  const visiting = new Set<string>();
  function visit(name: string): void {
    const preset = catalog[name];
    if (!preset)
      throw new Stopped(
        'unsupported',
        `Unknown gitattributes preset '${name}'. Available: ${Object.keys(catalog).sort().join(', ')}.`,
      );
    if (visiting.has(name))
      throw new Stopped(
        'conflict',
        `Gitattributes preset cycle: ${[...visiting, name].join(' -> ')}.`,
      );
    if (seen.has(name)) return;
    visiting.add(name);
    if ('presets' in preset) for (const child of preset.presets) visit(child);
    else
      for (const line of preset.lines)
        if (!lineSet.has(line)) {
          lineSet.add(line);
          lines.push(line);
        }
    visiting.delete(name);
    seen.add(name);
  }
  for (const name of requested) {
    if (!names.includes(name)) names.push(name);
    visit(name);
  }
  return {
    names,
    lines: [
      ...lines.filter((line) => line.startsWith('* ')),
      ...lines.filter((line) => !line.startsWith('* ')),
    ],
  };
}

async function localDriverPlan(root: string): Promise<GitConfigPlan> {
  let values: string[];
  try {
    const { stdout } = await exec(
      'git',
      ['-C', root, 'config', '--local', '--null', '--get-all', nodiffDriverKey],
      { timeout: 3000 },
    );
    values = stdout.split('\0').filter((value) => value.length > 0);
  } catch (error) {
    if ((error as { code?: string | number }).code === 1) values = [];
    else
      throw new Error(
        'The nodiff preset requires an available, writable local Git repository.',
      );
  }
  if (
    values.length > 1 ||
    (values.length === 1 && values[0] !== nodiffDriverValue)
  ) {
    throw new Stopped(
      'conflict',
      `${nodiffDriverKey} is already configured locally with a different value. Current: ${values.join(' | ')}. Desired: ${nodiffDriverValue}`,
    );
  }
  return {
    root,
    key: nodiffDriverKey,
    value: nodiffDriverValue,
    install: values.length === 0,
  };
}

export async function applyGitConfig(plan: GitConfigPlan): Promise<boolean> {
  if (!plan.install) return false;
  await exec(
    'git',
    ['-C', plan.root, 'config', '--local', plan.key, plan.value],
    { timeout: 3000 },
  );
  return true;
}

export async function removeGitConfig(plan: GitConfigPlan): Promise<void> {
  await exec(
    'git',
    [
      '-C',
      plan.root,
      'config',
      '--local',
      '--fixed-value',
      '--unset-all',
      plan.key,
      plan.value,
    ],
    { timeout: 3000 },
  );
}

export async function verifyGitConfig(plan: GitConfigPlan): Promise<void> {
  const current = await localDriverPlan(plan.root);
  if (current.install) throw new Error(`Verification failed: ${plan.key}`);
}

type Line = {
  text: string;
  start: number;
  end: number;
  after: number;
  eol: string;
};

function linesOf(text: string): Line[] {
  const lines: Line[] = [];
  const expression = /([^\r\n]*)(\r\n|\n|$)/g;
  for (let matched; (matched = expression.exec(text));) {
    const [whole, line, eol] = matched;
    lines.push({
      text: line!,
      start: matched.index,
      end: matched.index + line!.length,
      after: matched.index + whole!.length,
      eol: eol!,
    });
    if (!whole) break;
  }
  return lines;
}

function preferredEol(text: string | undefined): string {
  return text?.includes('\r\n') ? '\r\n' : '\n';
}

function attributeValues(line: string): Map<string, string> | undefined {
  const parts = line.trim().split(/\s+/);
  if (!parts[0] || parts[0].startsWith('#') || parts.length < 2)
    return undefined;
  const values = new Map<string, string>();
  for (const token of parts.slice(1)) {
    const matched = token.match(/^(-|!)?([^=]+)(?:=(.*))?$/);
    if (!matched) continue;
    values.set(
      matched[2]!,
      matched[1] === '-'
        ? 'false'
        : matched[1] === '!'
          ? 'unspecified'
          : (matched[3] ?? 'true'),
    );
  }
  return values;
}

function conflictingRule(userLine: string, generatedLine: string): boolean {
  const user = userLine.trim().split(/\s+/);
  const generated = generatedLine.trim().split(/\s+/);
  if (user[0] !== generated[0]) return false;
  const left = attributeValues(userLine);
  const right = attributeValues(generatedLine);
  if (!left || !right) return false;
  return [...left].some(
    ([name, value]) => right.has(name) && right.get(name) !== value,
  );
}

function renderBlock(
  names: string[],
  lines: string[],
  override: string | undefined,
  eol: string,
): string {
  const command = [
    'le add gitattributes',
    ...names.flatMap((name) => ['--preset', name]),
  ].join(' ');
  let result = [
    begin,
    `# Managed by Leftium. Selected presets: ${names.join(', ')}.`,
    `# Regenerate: ${command}`,
    ...(names.includes('nodiff')
      ? [
          '# diff=nodiff requires the local Git driver; rerun this command after cloning.',
        ]
      : []),
    '# Put custom rules outside this block or in .leftium/gitattributes.override.',
    ...lines,
  ].join(eol);
  if (override !== undefined && override.length) {
    result += `${lines.length ? eol : ''}${override}`;
    if (!override.endsWith('\n')) result += eol;
  } else result += eol;
  return `${result}${end}`;
}

function reconcile(
  existing: string | undefined,
  block: string,
  generatedLines: string[],
): string {
  if (existing === undefined) return `${block}\n`;
  const lines = linesOf(existing);
  const markerLines = lines.filter((line) =>
    line.text.trim().includes('LEFTIUM GITATTRIBUTES'),
  );
  const begins = markerLines.filter((line) => line.text.trim() === begin);
  const ends = markerLines.filter((line) => line.text.trim() === end);
  if (
    markerLines.length &&
    (begins.length !== 1 ||
      ends.length !== 1 ||
      begins[0]!.start >= ends[0]!.start)
  ) {
    throw new Stopped(
      'conflict',
      'Malformed or ambiguous Leftium gitattributes markers; repair the marked block before retrying.',
    );
  }
  const userLines = begins.length
    ? lines.filter(
        (line) => line.start < begins[0]!.start || line.start > ends[0]!.start,
      )
    : lines;
  for (const userLine of userLines) {
    const conflict = generatedLines.find((generatedLine) =>
      conflictingRule(userLine.text, generatedLine),
    );
    if (conflict)
      throw new Stopped(
        'conflict',
        `User-owned gitattributes rule conflicts with generated rule '${conflict}': ${userLine.text}`,
      );
  }
  if (begins.length)
    return `${existing.slice(0, begins[0]!.start)}${block}${ends[0]!.eol}${existing.slice(ends[0]!.after)}`;
  const eol = preferredEol(existing);
  return `${existing}${existing.endsWith('\n') ? eol : `${eol}${eol}`}${block}${eol}`;
}

export async function planGitattributes(
  context: ProjectContext,
  request: GitattributesRequest,
): Promise<GitattributesPlan> {
  const root = context.gitRoot ?? context.target;
  const resolved = resolvePresets(requestedNames(request.preset));
  const gitConfig = resolved.names.includes('nodiff')
    ? context.gitRoot
      ? await localDriverPlan(context.gitRoot)
      : (() => {
          throw new Stopped(
            'unsupported',
            'The nodiff preset requires an available local Git repository; no files were changed.',
          );
        })()
    : undefined;
  const path = join(root, '.gitattributes');
  const override = await readRegular(
    join(root, '.leftium', 'gitattributes.override'),
  );
  const existing = await readRegular(path);
  const block = renderBlock(
    resolved.names,
    resolved.lines,
    override,
    preferredEol(existing),
  );
  const overrideLines =
    override === undefined ? [] : linesOf(override).map((line) => line.text);
  const after = reconcile(existing, block, [
    ...resolved.lines,
    ...overrideLines,
  ]);
  return {
    edits: after === existing ? [] : [{ path, before: existing, after }],
    gitConfig,
  };
}
